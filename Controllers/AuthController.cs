using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using PharmacyApi.Models;
using PharmacyApi.Services;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private const long MaxProfileImageBytes = 2 * 1024 * 1024;
        private static readonly string[] AllowedRegistrationRoles = ["Admin", "Manager", "Cashier"];
        private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };
        private static readonly HashSet<string> AllowedImageMimeTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"
        };

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        private readonly IUserManagementService _userService;
        private readonly IWebHostEnvironment _environment;

        public AuthController(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, IConfiguration configuration, IEmailService emailService, IUserManagementService userService, IWebHostEnvironment environment)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _configuration = configuration;
            _emailService = emailService;
            _userService = userService;
            _environment = environment;
        }

        [HttpPost("register")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> Register([FromBody] RegisterModel model)
        {
            // ARCHITECTURAL INTENT: Public self-registration is disabled for multi-tenant SaaS security.
            // Only SystemAdmin may invoke this endpoint, protected roles (e.g. SystemAdmin) are blocked,
            // and a valid active TenantId is mandatory to eliminate tenantless orphan accounts.
            var requestedRole = model.Role?.Trim() ?? string.Empty;
            var canonicalRole = AllowedRegistrationRoles
                .FirstOrDefault(r => r.Equals(requestedRole, StringComparison.OrdinalIgnoreCase));
            if (canonicalRole == null)
                return BadRequest("Invalid or protected role. Allowed roles: Admin, Manager, Cashier.");

            if (!model.TenantId.HasValue || model.TenantId.Value <= 0)
                return BadRequest("A valid TenantId is required.");

            var (validAssignment, assignmentError) =
                await _userService.ValidateTenantBranchAssignmentAsync(model.TenantId.Value, model.BranchId);
            if (!validAssignment)
                return BadRequest(assignmentError);

            var userExists = await _userManager.FindByNameAsync(model.Username);
            if (userExists != null) return BadRequest("User already exists!");

            var emailExists = await _userManager.FindByEmailAsync(model.Email);
            if (emailExists != null) return BadRequest("Email is already in use!");

            ApplicationUser user = new()
            {
                Email = model.Email,
                SecurityStamp = Guid.NewGuid().ToString(),
                UserName = model.Username,
                FullName = model.FullName,
                PhoneNumber = model.PhoneNumber,
                Address = model.Address,
                TenantId = model.TenantId.Value,
                BranchId = model.BranchId is > 0 ? model.BranchId.Value : null,
                IsActive = true,
                EmailConfirmed = true
            };

            var result = await _userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return BadRequest(string.Join(", ", result.Errors.Select(e => e.Description)));

            if (!await _roleManager.RoleExistsAsync(canonicalRole))
                await _roleManager.CreateAsync(new IdentityRole(canonicalRole));

            var roleResult = await _userManager.AddToRoleAsync(user, canonicalRole);
            if (!roleResult.Succeeded)
            {
                await _userManager.DeleteAsync(user);
                return BadRequest(string.Join(", ", roleResult.Errors.Select(e => e.Description)));
            }

            return Ok("User created successfully!");
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginModel model)
        {
            var user = await _userManager.FindByNameAsync(model.Username);
            if (user != null && await _userManager.CheckPasswordAsync(user, model.Password))
            {
                var userRoles = await _userManager.GetRolesAsync(user);
                var (allowed, denialReason) = await _userService.ValidateUserLoginEligibilityAsync(user, userRoles);
                if (!allowed)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new { message = denialReason });
                }

                var authClaims = new List<Claim>
                {
                    new Claim(ClaimTypes.Name, user.UserName!),
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                    new Claim("FullName", user.FullName),
                    // ─── SaaS Claims (Tenant + Branch Identity) ───────────────
                    // ARCHITECTURAL INTENT: TenantId ও BranchId JWT-তে embed হয়।
                    // TenantContextService এই claims থেকে context resolve করে।
                    // empty string = null/not assigned (SystemAdmin-এর ক্ষেত্রে)।
                    new Claim("TenantId", user.TenantId?.ToString() ?? ""),
                    new Claim("BranchId", user.BranchId?.ToString() ?? "")
                };

                foreach (var userRole in userRoles)
                {
                    authClaims.Add(new Claim(ClaimTypes.Role, userRole));
                }

                var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));

                var token = new JwtSecurityToken(
                    issuer: _configuration["Jwt:Issuer"],
                    audience: _configuration["Jwt:Audience"],
                    expires: TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time")).AddHours(3),
                    claims: authClaims,
                    signingCredentials: new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256)
                    );

                var permissions = await _userService.GetEffectivePermissionsAsync(user.Id);
                var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

                Response.Cookies.Append("auth_token", tokenString, BuildAuthCookieOptions(token.ValidTo));

                return Ok(new
                {
                    id = user.Id,
                    userName = user.UserName,
                    email = user.Email,
                    phoneNumber = user.PhoneNumber,
                    address = user.Address,
                    profilePicturePath = user.ProfilePicturePath,
                    roles = userRoles,
                    fullName = user.FullName,
                    permissions = permissions,
                    // ─── SaaS: Tenant + Branch info ───
                    tenantId  = user.TenantId,
                    branchId  = user.BranchId
                });
            }
            return Unauthorized();
        }
        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordModel model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // Return Ok even if user doesn't exist to prevent email enumeration attacks
                return Ok(new { Message = "If that email address is in our database, we will send you an email to reset your password." });
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            
            // In a real application, send this token via email.
            var frontendUrl = ResolveFrontendBaseUrl();
            var resetLink = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email!)}";

            await _emailService.SendEmailAsync(user.Email!, "Reset Your Password", 
                $"Please reset your password by clicking here: <a href='{resetLink}'>Reset Password</a>");
            
            return Ok(new 
            { 
                Message = "If that email address is in our database, we will send you an email to reset your password."
            });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordModel model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);
            if (user == null)
            {
                // Don't reveal that the user does not exist
                return BadRequest("Invalid request.");
            }

            var result = await _userManager.ResetPasswordAsync(user, model.Token, model.NewPassword);
            if (result.Succeeded)
            {
                return Ok(new { Message = "Password has been reset successfully." });
            }

            return BadRequest(string.Join(", ", result.Errors.Select(e => e.Description)));
        }

        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordModel model)
        {
            var (callerId, authFailure) = ResolveCallerOrReject(model.UserId);
            if (authFailure != null) return authFailure;

            var user = await _userManager.FindByIdAsync(callerId!);
            if (user == null)
                return NotFound("User not found.");

            var result = await _userManager.ChangePasswordAsync(user, model.OldPassword, model.NewPassword);
            if (result.Succeeded)
                return Ok(new { Message = "Password changed successfully." });

            return BadRequest(string.Join(", ", result.Errors.Select(e => e.Description)));
        }

        [HttpPost("logout")]
        [AllowAnonymous]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("auth_token", BuildAuthCookieOptions());
            return Ok(new { Message = "Logged out successfully" });
        }

        [HttpPost("upload-profile-picture")]
        [RequestSizeLimit(3 * 1024 * 1024)]
        public async Task<IActionResult> UploadProfilePicture([FromForm] IFormFile? file, [FromForm] string? userId = null)
        {
            var (callerId, authFailure) = ResolveCallerOrReject(userId);
            if (authFailure != null) return authFailure;

            if (file == null || file.Length == 0)
                return BadRequest("No file uploaded.");

            if (file.Length > MaxProfileImageBytes)
                return BadRequest("File size exceeds 2MB limit.");

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            if (string.IsNullOrEmpty(ext) || !AllowedImageExtensions.Contains(ext))
                return BadRequest("Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.");

            if (!string.IsNullOrWhiteSpace(file.ContentType) && !AllowedImageMimeTypes.Contains(file.ContentType))
                return BadRequest("Invalid image content type.");

            if (!await HasValidImageSignatureAsync(file, ext))
                return BadRequest("Invalid or corrupted image file signature.");

            var user = await _userManager.FindByIdAsync(callerId!);
            if (user == null) return NotFound("User not found.");

            var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : _environment.WebRootPath;
            var uploadsFolder = Path.Combine(webRoot, "uploads", "profiles");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            DeleteOldProfileImageSafely(webRoot, uploadsFolder, user.ProfilePicturePath);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            user.ProfilePicturePath = $"/uploads/profiles/{fileName}";
            await _userManager.UpdateAsync(user);

            return Ok(new { profilePicturePath = user.ProfilePicturePath });
        }

        private (string? CallerId, IActionResult? Failure) ResolveCallerOrReject(string? requestedUserId)
        {
            var callerId = User?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(callerId))
                return (null, Unauthorized());

            if (!string.IsNullOrWhiteSpace(requestedUserId) &&
                !string.Equals(requestedUserId.Trim(), callerId, StringComparison.Ordinal))
            {
                return (null, Forbid());
            }

            return (callerId, null);
        }

        private static async Task<bool> HasValidImageSignatureAsync(IFormFile file, string ext)
        {
            var header = new byte[12];
            await using var stream = file.OpenReadStream();
            int totalRead = 0;
            while (totalRead < header.Length)
            {
                int read = await stream.ReadAsync(header.AsMemory(totalRead, header.Length - totalRead));
                if (read == 0) break;
                totalRead += read;
            }

            return ext switch
            {
                ".jpg" or ".jpeg" => totalRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => totalRead >= 8 &&
                          header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                          header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
                ".webp" => totalRead >= 12 &&
                           header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                           header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
                _ => false
            };
        }

        private static void DeleteOldProfileImageSafely(string webRoot, string uploadsFolder, string? profilePicturePath)
        {
            if (string.IsNullOrWhiteSpace(profilePicturePath)) return;

            var uploadsRootFull = Path.GetFullPath(uploadsFolder);
            var prefixWithSep = uploadsRootFull.EndsWith(Path.DirectorySeparatorChar)
                ? uploadsRootFull
                : uploadsRootFull + Path.DirectorySeparatorChar;

            var relativeOld = profilePicturePath.TrimStart('/', '\\').Replace('/', Path.DirectorySeparatorChar);
            var candidateFull = Path.GetFullPath(Path.Combine(webRoot, relativeOld));

            if (candidateFull.StartsWith(prefixWithSep, StringComparison.OrdinalIgnoreCase) &&
                System.IO.File.Exists(candidateFull))
            {
                System.IO.File.Delete(candidateFull);
            }
        }

        private CookieOptions BuildAuthCookieOptions(DateTime? expires = null)
        {
            // ARCHITECTURAL INTENT: Force Secure=true in all non-Development environments (even behind
            // reverse proxies where Request.IsHttps can be false without ForwardedHeaders), while still
            // allowing local HTTP development (http://localhost:5171) without dropping auth cookies.
            bool requireSecure = !_environment.IsDevelopment() || (HttpContext?.Request.IsHttps ?? false);

            var options = new CookieOptions
            {
                HttpOnly = true,
                Secure = requireSecure,
                SameSite = SameSiteMode.Strict
            };

            if (expires.HasValue)
            {
                options.Expires = expires.Value;
            }

            return options;
        }

        private string ResolveFrontendBaseUrl()
        {
            // ARCHITECTURAL INTENT: Cors:AllowedOrigins is a JSON array in appsettings.json and deploy.yml;
            // reading _configuration["Cors:AllowedOrigins"] as a scalar returned null and leaked localhost links in production.
            var explicitUrl = _configuration["FrontendUrl"];
            if (!string.IsNullOrWhiteSpace(explicitUrl))
                return explicitUrl.Trim().TrimEnd('/');

            var origins = (_configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [])
                .Where(o => !string.IsNullOrWhiteSpace(o))
                .Select(o => o.Trim().TrimEnd('/'))
                .ToList();

            if (origins.Count > 0)
            {
                bool preferLoopback = _environment.IsDevelopment();
                var matched = origins.FirstOrDefault(o =>
                    Uri.TryCreate(o, UriKind.Absolute, out var uri) && uri.IsLoopback == preferLoopback);

                return matched ?? origins[0];
            }

            return "http://localhost:4200";
        }
    }

    public class RegisterModel
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Full Name is required")]
        public string FullName { get; set; } = string.Empty;

        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public int? TenantId { get; set; }
        public int? BranchId { get; set; }
        public string Role { get; set; } = "Cashier";
    }

    public class LoginModel
    {
        [Required(ErrorMessage = "Username is required")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        public string Password { get; set; } = string.Empty;
    }

    public class ForgotPasswordModel
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;
    }

    public class ResetPasswordModel
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Token is required")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "New Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ChangePasswordModel
    {
        public string? UserId { get; set; }

        [Required(ErrorMessage = "Old Password is required")]
        public string OldPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "New Password is required")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
