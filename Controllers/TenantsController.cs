using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Models;
using PharmacyApi.Services;
using System.ComponentModel.DataAnnotations;

namespace PharmacyApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TenantsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly ITenantContextService _ctx;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IUserManagementService _userService;

        public TenantsController(
            ApplicationDbContext db,
            ITenantContextService ctx,
            UserManager<ApplicationUser> userManager,
            IUserManagementService userService)
        {
            _db          = db;
            _ctx         = ctx;
            _userManager = userManager;
            _userService = userService;
        }

        // ── GET /api/tenants/config ─────────────────────────────────────────
        // যেকোনো লগড-ইন ইউজার — নিজের Tenant-এর ব্র্যান্ডিং কনফিগ ও শাখার তালিকা লোড করে
        [HttpGet("config")]
        [Authorize]
        public async Task<IActionResult> GetConfig()
        {
            if (_ctx.IsSystemAdmin)
            {
                return Ok(new
                {
                    tenantId             = 0,
                    pharmacyName         = "teamS7 Tech Solutions",
                    tagline              = "Platform Administration",
                    subscriptionPlan     = "Internal",
                    canAccessAllBranches = false,
                    currentBranch        = (object?)null,
                    branches             = Array.Empty<object>()
                });
            }

            if (_ctx.TenantId == null)
                return Unauthorized();

            int tenantId = _ctx.TenantId.Value;
            var tenant = await _db.Tenants
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId);

            if (tenant == null) return NotFound();

            var branchQuery = _db.Branches
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(b => b.TenantId == tenantId && b.IsActive);

            // Branch-locked staff only receive their assigned branch; Tenant Admins receive all active branches.
            if (!_ctx.CanAccessAllBranches && _ctx.BranchId.HasValue)
            {
                int lockedBranchId = _ctx.BranchId.Value;
                branchQuery = branchQuery.Where(b => b.BranchId == lockedBranchId);
            }

            var branches = await branchQuery
                .OrderBy(b => b.IsHeadOffice ? 0 : 1)
                .ThenBy(b => b.BranchName)
                .Select(b => new
                {
                    branchId     = b.BranchId,
                    branchName   = b.BranchName,
                    isHeadOffice = b.IsHeadOffice,
                    isActive     = b.IsActive,
                    phone        = b.Phone,
                    address      = b.Address
                })
                .ToListAsync();

            var currentBranch = _ctx.BranchId.HasValue
                ? branches.FirstOrDefault(b => b.branchId == _ctx.BranchId.Value)
                : (!_ctx.CanAccessAllBranches ? branches.FirstOrDefault() : null);

            return Ok(new
            {
                tenantId             = tenant.TenantId,
                pharmacyName         = tenant.PharmacyName,
                tagline              = tenant.Slogan,
                slogan               = tenant.Slogan,
                headOfficeAddress    = tenant.HeadOfficeAddress,
                phone                = tenant.Phone,
                email                = tenant.Email,
                drugLicenseNo        = tenant.DrugLicenseNo,
                logoPath             = tenant.LogoPath,
                invoiceFooter        = tenant.InvoiceFooter,
                primaryColor         = tenant.PrimaryColor,
                subscriptionPlan     = tenant.SubscriptionPlan,
                subscriptionExpiry   = tenant.SubscriptionExpiry,
                canAccessAllBranches = _ctx.CanAccessAllBranches,
                currentBranch,
                branches
            });
        }

        // ── GET /api/tenants ─────────────────────────────────────────────────
        // SystemAdmin only — সব Tenant লিস্ট
        [HttpGet]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> GetAll()
        {
            var tenants = await _db.Tenants
                .IgnoreQueryFilters()
                .OrderBy(t => t.PharmacyName)
                .Select(t => new
                {
                    t.TenantId,
                    t.PharmacyName,
                    t.Email,
                    t.Phone,
                    t.SubscriptionPlan,
                    t.SubscriptionExpiry,
                    t.IsActive,
                    t.CreatedAt,
                    BranchCount = t.Branches.Count
                })
                .ToListAsync();

            return Ok(tenants);
        }

        // ── GET /api/tenants/{id} ─────────────────────────────────────────────
        [HttpGet("{id:int}")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> GetById(int id)
        {
            // Explicit DTO projection avoids EF navigation fixup cycles (Tenant <-> Branch) during System.Text.Json serialization.
            var tenant = await _db.Tenants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(t => t.TenantId == id)
                .Select(t => new
                {
                    t.TenantId,
                    t.PharmacyName,
                    t.Slogan,
                    t.HeadOfficeAddress,
                    t.Phone,
                    t.Email,
                    t.DrugLicenseNo,
                    t.LogoPath,
                    t.InvoiceFooter,
                    t.PrimaryColor,
                    t.SubscriptionPlan,
                    t.SubscriptionExpiry,
                    t.IsActive,
                    t.CreatedAt,
                    Branches = t.Branches
                        .OrderBy(b => b.IsHeadOffice ? 0 : 1)
                        .ThenBy(b => b.BranchName)
                        .Select(b => new
                        {
                            b.BranchId,
                            b.TenantId,
                            b.BranchName,
                            b.Address,
                            b.Phone,
                            b.DrugLicenseNo,
                            b.IsHeadOffice,
                            b.IsActive,
                            b.CreatedAt
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            return tenant == null ? NotFound() : Ok(tenant);
        }

        // ── POST /api/tenants ─────────────────────────────────────────────────
        // নতুন ফার্মেসি (Tenant) + Default Branch + Default RolePermissions + Optional Initial Admin তৈরি
        [HttpPost]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> Create([FromBody] CreateTenantDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            bool hasAnyAdminField = !string.IsNullOrWhiteSpace(dto.AdminUserName)
                                 || !string.IsNullOrWhiteSpace(dto.AdminEmail)
                                 || !string.IsNullOrWhiteSpace(dto.AdminPassword)
                                 || !string.IsNullOrWhiteSpace(dto.AdminFullName);

            if (hasAnyAdminField &&
                (string.IsNullOrWhiteSpace(dto.AdminUserName) ||
                 string.IsNullOrWhiteSpace(dto.AdminEmail) ||
                 string.IsNullOrWhiteSpace(dto.AdminPassword)))
            {
                return BadRequest("Initial Admin তৈরি করতে AdminUserName, AdminEmail এবং AdminPassword তিনটিই প্রদান করতে হবে।");
            }

            return await _db.ExecuteInTransactionAsync<IActionResult>(async ct =>
            {
                var tenant = new Tenant
                {
                    PharmacyName      = dto.PharmacyName,
                    Slogan            = dto.Slogan,
                    HeadOfficeAddress = dto.Address,
                    Phone             = dto.Phone,
                    Email             = dto.Email,
                    DrugLicenseNo     = dto.DrugLicenseNo,
                    InvoiceFooter     = dto.InvoiceFooter,
                    PrimaryColor      = dto.PrimaryColor,
                    SubscriptionPlan  = dto.SubscriptionPlan ?? "Trial",
                    SubscriptionExpiry= dto.SubscriptionExpiry,
                    IsActive          = true
                };
                _db.Tenants.Add(tenant);
                await _db.SaveChangesAsync(ct); // TenantId generate হবে

                // Default Head Office Branch তৈরি
                var defaultBranch = new Branch
                {
                    TenantId     = tenant.TenantId,
                    BranchName   = dto.HeadOfficeBranchName ?? "মেইন আউটলেট",
                    Address      = dto.Address,
                    Phone        = dto.Phone,
                    DrugLicenseNo= dto.DrugLicenseNo,
                    IsHeadOffice = true,
                    IsActive     = true
                };
                _db.Branches.Add(defaultBranch);
                await _db.SaveChangesAsync(ct);

                // নতুন Tenant-এর জন্য Default RolePermissions (Admin/Manager/Cashier) সিড করা
                await _userService.SeedDefaultPermissionsForTenantAsync(tenant.TenantId, ct);

                ApplicationUser? createdAdmin = null;
                if (hasAnyAdminField)
                {
                    var adminUserName = dto.AdminUserName!.Trim();
                    var adminEmail    = dto.AdminEmail!.Trim();

                    if (await _userManager.FindByNameAsync(adminUserName) != null)
                        return (false, BadRequest($"ইউজারনেম '{adminUserName}' ইতিমধ্যে ব্যবহৃত হচ্ছে।"));

                    if (await _userManager.FindByEmailAsync(adminEmail) != null)
                        return (false, BadRequest($"ইমেইল '{adminEmail}' ইতিমধ্যে ব্যবহৃত হচ্ছে।"));

                    createdAdmin = new ApplicationUser
                    {
                        UserName       = adminUserName,
                        Email          = adminEmail,
                        FullName       = string.IsNullOrWhiteSpace(dto.AdminFullName)
                                             ? $"{dto.PharmacyName.Trim()} Admin"
                                             : dto.AdminFullName.Trim(),
                        PhoneNumber    = dto.AdminPhoneNumber?.Trim() ?? dto.Phone?.Trim(),
                        Address        = dto.Address,
                        SecurityStamp  = Guid.NewGuid().ToString(),
                        // ARCHITECTURAL INTENT: Initial Tenant Admin owner MUST belong to tenant.TenantId
                        // with BranchId = null so the owner can view and switch across all branches of the pharmacy.
                        TenantId       = tenant.TenantId,
                        BranchId       = null,
                        IsActive       = true,
                        EmailConfirmed = true
                    };

                    var createUserResult = await _userManager.CreateAsync(createdAdmin, dto.AdminPassword!);
                    if (!createUserResult.Succeeded)
                    {
                        var errors = string.Join("; ", createUserResult.Errors.Select(e => e.Description));
                        return (false, BadRequest(errors));
                    }

                    var addRoleResult = await _userManager.AddToRoleAsync(createdAdmin, "Admin");
                    if (!addRoleResult.Succeeded)
                    {
                        var errors = string.Join("; ", addRoleResult.Errors.Select(e => e.Description));
                        return (false, BadRequest(errors));
                    }
                }

                IActionResult result = CreatedAtAction(nameof(GetById), new { id = tenant.TenantId }, new
                {
                    tenant.TenantId,
                    defaultBranch.BranchId,
                    tenant.PharmacyName,
                    adminUser = createdAdmin == null ? null : new
                    {
                        id       = createdAdmin.Id,
                        userName = createdAdmin.UserName,
                        email    = createdAdmin.Email,
                        fullName = createdAdmin.FullName,
                        tenantId = createdAdmin.TenantId,
                        branchId = createdAdmin.BranchId
                    }
                });
                return (true, result);
            });
        }

        // ── PUT /api/tenants/{id} ─────────────────────────────────────────────
        [HttpPut("{id:int}")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTenantDto dto)
        {
            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == id);
            if (tenant == null) return NotFound();

            tenant.PharmacyName       = dto.PharmacyName ?? tenant.PharmacyName;
            tenant.Slogan             = dto.Slogan       ?? tenant.Slogan;
            tenant.HeadOfficeAddress  = dto.Address      ?? tenant.HeadOfficeAddress;
            tenant.Phone              = dto.Phone        ?? tenant.Phone;
            tenant.Email              = dto.Email        ?? tenant.Email;
            tenant.DrugLicenseNo      = dto.DrugLicenseNo?? tenant.DrugLicenseNo;
            tenant.InvoiceFooter      = dto.InvoiceFooter?? tenant.InvoiceFooter;
            tenant.PrimaryColor       = dto.PrimaryColor ?? tenant.PrimaryColor;
            tenant.SubscriptionPlan   = dto.SubscriptionPlan  ?? tenant.SubscriptionPlan;
            tenant.SubscriptionExpiry = dto.SubscriptionExpiry ?? tenant.SubscriptionExpiry;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── PATCH /api/tenants/{id}/status ───────────────────────────────────
        [HttpPatch("{id:int}/status")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> SetStatus(int id, [FromBody] bool isActive)
        {
            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == id);
            if (tenant == null) return NotFound();
            tenant.IsActive = isActive;
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ── POST /api/tenants/{id}/logo ───────────────────────────────────────
        [HttpPost("{id:int}/logo")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> UploadLogo(int id, IFormFile file, IWebHostEnvironment env, CancellationToken cancellationToken = default)
        {
            var (isValid, errorMsg, ext) = await ImageUploadValidator.ValidateAsync(file, ImageUploadValidator.DefaultMaxImageBytes, cancellationToken);
            if (!isValid) return BadRequest(errorMsg);

            var tenant = await _db.Tenants.IgnoreQueryFilters().FirstOrDefaultAsync(t => t.TenantId == id, cancellationToken);
            if (tenant == null) return NotFound();

            tenant.LogoPath = await ImageUploadValidator.SaveToWebRootAsync(
                file, env, $"logo{ext}", cancellationToken, "uploads", "logos", $"tenant-{id}");
            await _db.SaveChangesAsync(cancellationToken);

            return Ok(new { logoPath = tenant.LogoPath });
        }
    }

    // ── DTOs ─────────────────────────────────────────────────────────────────
    public class CreateTenantDto
    {
        [Required] public string PharmacyName { get; set; } = string.Empty;
        public string? Slogan { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        [EmailAddress] public string? Email { get; set; }
        public string? DrugLicenseNo { get; set; }
        public string? InvoiceFooter { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SubscriptionPlan { get; set; }
        public DateTime? SubscriptionExpiry { get; set; }
        public string? HeadOfficeBranchName { get; set; }

        // Optional All-or-None group for onboarding the Tenant's initial Admin user
        [StringLength(100)] public string? AdminFullName { get; set; }
        [StringLength(50)]  public string? AdminUserName { get; set; }
        [EmailAddress]      public string? AdminEmail { get; set; }
        [MinLength(6)]      public string? AdminPassword { get; set; }
        public string? AdminPhoneNumber { get; set; }
    }

    public class UpdateTenantDto
    {
        public string? PharmacyName { get; set; }
        public string? Slogan { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        [EmailAddress] public string? Email { get; set; }
        public string? DrugLicenseNo { get; set; }
        public string? InvoiceFooter { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SubscriptionPlan { get; set; }
        public DateTime? SubscriptionExpiry { get; set; }
    }
}
