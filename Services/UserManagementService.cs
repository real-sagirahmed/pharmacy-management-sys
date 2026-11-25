using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Services
{
    public interface IUserManagementService
    {
        Task<IEnumerable<UserDto>> GetAllUsersAsync();
        Task<IdentityResult> CreateUserAsync(CreateUserDto model);
        Task<IdentityResult> UpdateUserAsync(string userId, UpdateUserDto model);
        Task<bool> ToggleUserStatusAsync(string userId);
        Task<IEnumerable<RoleDto>> GetRolesAsync();
        Task<IdentityResult> CreateRoleAsync(string roleName);
        Task<IdentityResult> UpdateRoleAsync(string roleId, string newName);
        Task<IdentityResult> DeleteRoleAsync(string roleId);
        Task<IdentityResult> DeleteUserAsync(string userId);
        Task<IEnumerable<PermissionDto>> GetPermissionsByRoleAsync(string roleId, int? tenantId = null);
        Task UpdatePermissionsAsync(string roleId, IEnumerable<PermissionDto> permissions, int? tenantId = null);
        Task SeedDefaultPermissionsForTenantAsync(int tenantId, CancellationToken cancellationToken = default);
        Task<IEnumerable<PermissionDto>> GetEffectivePermissionsAsync(string userId);
        Task<IdentityResult> AssignUserRoleAsync(string userId, string newRole);
        Task<bool> IsUserSystemAdminAsync(string userId);
        Task<(bool Valid, string? ErrorMessage)> ValidateTenantBranchAssignmentAsync(
            int tenantId,
            int? branchId,
            CancellationToken cancellationToken = default);
        Task<(bool Allowed, string? DenialReason)> ValidateUserLoginEligibilityAsync(
            ApplicationUser user,
            IList<string> roles,
            CancellationToken cancellationToken = default);
    }

    public class UserManagementService : IUserManagementService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ApplicationDbContext _context;
        private readonly ITenantContextService _ctx;

        public UserManagementService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ApplicationDbContext context,
            ITenantContextService ctx)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
            _ctx = ctx;
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            var query = _userManager.Users.AsQueryable();
            if (!_ctx.IsSystemAdmin && _ctx.TenantId.HasValue)
            {
                query = query.Where(u => u.TenantId == _ctx.TenantId.Value);
                if (_ctx.BranchId.HasValue)
                {
                    query = query.Where(u => u.BranchId == null || u.BranchId == _ctx.BranchId.Value);
                }
            }

            var users = await query.ToListAsync();
            var userList = new List<UserDto>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                userList.Add(new UserDto
                {
                    Id = user.Id,
                    UserName = user.UserName!,
                    Email = user.Email!,
                    FullName = user.FullName,
                    IsActive = user.IsActive,
                    PhoneNumber = user.PhoneNumber,
                    Address = user.Address,
                    ProfilePicturePath = user.ProfilePicturePath,
                    TenantId = user.TenantId,
                    BranchId = user.BranchId,
                    Roles = roles
                });
            }
            return userList;
        }

        public async Task<IdentityResult> CreateUserAsync(CreateUserDto model)
        {
            var tenantId = _ctx.TenantId ?? (model.TenantId.HasValue && model.TenantId.Value > 0 ? model.TenantId : null);
            var branchId = _ctx.BranchId ?? (model.BranchId.HasValue && model.BranchId.Value > 0 ? model.BranchId : null);

            var user = new ApplicationUser
            {
                UserName = model.UserName,
                Email = model.Email,
                FullName = model.FullName,
                PhoneNumber = model.PhoneNumber,
                Address = model.Address,
                TenantId = tenantId,
                BranchId = branchId,
                IsActive = true
            };

            if (model.Role.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase))
                return IdentityResult.Failed(new IdentityError { Description = "The 'SystemAdmin' role is protected and cannot be assigned during manual creation." });

            var result = await _userManager.CreateAsync(user, model.Password);
            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, model.Role);
            }
            return result;
        }

        public async Task<bool> ToggleUserStatusAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            // Protect SystemAdmin from being deactivated if they are the only one
            var userRoles = await _userManager.GetRolesAsync(user);
            if (userRoles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
            {
                var systemAdmins = await _userManager.GetUsersInRoleAsync("SystemAdmin");
                if (systemAdmins.Count <= 1)
                    return false;
            }

            user.IsActive = !user.IsActive;
            var result = await _userManager.UpdateAsync(user);
            return result.Succeeded;
        }

        public async Task<IEnumerable<RoleDto>> GetRolesAsync()
        {
            var roles = await _roleManager.Roles.ToListAsync();
            var roleDtos = new List<RoleDto>();

            foreach (var role in roles)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
                roleDtos.Add(new RoleDto 
                { 
                    Id = role.Id, 
                    Name = role.Name!,
                    UserCount = usersInRole.Count
                });
            }

            return roleDtos;
        }

        public async Task<IdentityResult> CreateRoleAsync(string roleName)
        {
            if (roleName.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase))
                return IdentityResult.Failed(new IdentityError { Description = "SystemAdmin is a reserved role and cannot be created manually." });

            if (await _roleManager.RoleExistsAsync(roleName))
                return IdentityResult.Failed(new IdentityError { Description = "Role already exists" });

            return await _roleManager.CreateAsync(new IdentityRole(roleName));
        }

        public async Task<IdentityResult> UpdateRoleAsync(string roleId, string newName)
        {
            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null) return IdentityResult.Failed(new IdentityError { Description = "Role not found" });

            if (role.Name!.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)) return IdentityResult.Failed(new IdentityError { Description = "SystemAdmin role cannot be renamed. It is a protected system role." });
            if (role.Name == "Admin") return IdentityResult.Failed(new IdentityError { Description = "Cannot rename Admin role" });
            if (newName.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase))
                return IdentityResult.Failed(new IdentityError { Description = "'SystemAdmin' is a reserved name and cannot be used." });

            role.Name = newName;
            return await _roleManager.UpdateAsync(role);
        }

        public async Task<IdentityResult> DeleteRoleAsync(string roleId)
        {
            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null) return IdentityResult.Failed(new IdentityError { Description = "Role not found" });

            if (role.Name!.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)) return IdentityResult.Failed(new IdentityError { Description = "SystemAdmin role cannot be deleted. It is a protected system role." });
            if (role.Name == "Admin") return IdentityResult.Failed(new IdentityError { Description = "Cannot delete Admin role" });

            var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
            if (usersInRole.Any())
                return IdentityResult.Failed(new IdentityError { Description = "Cannot delete role while it has users assigned" });

            return await _roleManager.DeleteAsync(role);
        }

        public async Task<IdentityResult> DeleteUserAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return IdentityResult.Failed(new IdentityError { Description = "User not found" });

            // Protect SystemAdmin user from deletion if they are the last one
            var userRoles = await _userManager.GetRolesAsync(user);
            if (userRoles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
            {
                var systemAdmins = await _userManager.GetUsersInRoleAsync("SystemAdmin");
                if (systemAdmins.Count <= 1)
                    return IdentityResult.Failed(new IdentityError { Description = "The last SystemAdmin user cannot be deleted." });
            }

            return await _userManager.DeleteAsync(user);
        }

        public async Task<IdentityResult> UpdateUserAsync(string userId, UpdateUserDto model)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return IdentityResult.Failed(new IdentityError { Description = "User not found" });

            user.FullName = model.FullName;
            user.PhoneNumber = model.PhoneNumber;
            user.Address = model.Address;
            if (model.BranchId.HasValue)
            {
                user.BranchId = model.BranchId.Value > 0 ? model.BranchId.Value : null;
            }

            // Update Email if changed
            if (!string.Equals(user.Email, model.Email, StringComparison.OrdinalIgnoreCase))
            {
                var emailResult = await _userManager.SetEmailAsync(user, model.Email);
                if (!emailResult.Succeeded) return emailResult;
            }

            // Update UserName if changed
            if (!string.Equals(user.UserName, model.UserName, StringComparison.OrdinalIgnoreCase))
            {
                var userResult = await _userManager.SetUserNameAsync(user, model.UserName);
                if (!userResult.Succeeded) return userResult;
            }
            
            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded && !string.IsNullOrWhiteSpace(model.Password))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                result = await _userManager.ResetPasswordAsync(user, token, model.Password);
            }

            return result;
        }

        private int ResolveTargetTenantId(int? requestedTenantId)
        {
            if (!_ctx.IsSystemAdmin)
            {
                if (!_ctx.TenantId.HasValue || _ctx.TenantId.Value <= 0)
                    throw new UnauthorizedAccessException("Tenant context is required to access or update role permissions.");

                return _ctx.TenantId.Value;
            }

            var resolved = requestedTenantId.HasValue && requestedTenantId.Value > 0
                ? requestedTenantId.Value
                : (_ctx.TenantId.HasValue && _ctx.TenantId.Value > 0 ? _ctx.TenantId.Value : 0);

            if (resolved <= 0)
                throw new ArgumentException("A valid positive TenantId is required when SystemAdmin manages tenant role permissions.");

            return resolved;
        }

        public async Task<IEnumerable<PermissionDto>> GetPermissionsByRoleAsync(string roleId, int? tenantId = null)
        {
            var targetTenantId = ResolveTargetTenantId(tenantId);

            return await _context.RolePermissions
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(p => p.TenantId == targetTenantId && p.RoleId == roleId)
                .Select(p => new PermissionDto
                {
                    Id = p.Id,
                    RoleId = p.RoleId,
                    ModuleName = p.ModuleName,
                    CanView = p.CanView,
                    CanCreate = p.CanCreate,
                    CanEdit = p.CanEdit,
                    CanDelete = p.CanDelete
                }).ToListAsync();
        }

        public async Task UpdatePermissionsAsync(string roleId, IEnumerable<PermissionDto> permissions, int? tenantId = null)
        {
            var targetTenantId = ResolveTargetTenantId(tenantId);

            var role = await _roleManager.FindByIdAsync(roleId);
            if (role == null)
                throw new KeyNotFoundException("Role not found.");

            if (role.Name != null && role.Name.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase))
                throw new ArgumentException("SystemAdmin permissions are automatic and cannot be modified.");

            var existing = await _context.RolePermissions
                .IgnoreQueryFilters()
                .Where(p => p.TenantId == targetTenantId && p.RoleId == roleId)
                .ToListAsync();
            _context.RolePermissions.RemoveRange(existing);

            var newPermissions = permissions
                .Where(p => !string.IsNullOrWhiteSpace(p.ModuleName))
                .GroupBy(p => p.ModuleName.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(g => g.First())
                .Select(p => new RolePermission
                {
                    TenantId = targetTenantId,
                    RoleId = roleId,
                    ModuleName = p.ModuleName.Trim(),
                    CanView = p.CanView,
                    CanCreate = p.CanCreate,
                    CanEdit = p.CanEdit,
                    CanDelete = p.CanDelete
                });

            await _context.RolePermissions.AddRangeAsync(newPermissions);
            await _context.SaveChangesAsync();
        }

        public async Task SeedDefaultPermissionsForTenantAsync(int tenantId, CancellationToken cancellationToken = default)
        {
            if (tenantId <= 0)
                throw new ArgumentException("TenantId must be positive.", nameof(tenantId));

            // Idempotent guard: never overwrite custom permissions if tenant already has configured rows
            var alreadyHasPermissions = await _context.RolePermissions
                .IgnoreQueryFilters()
                .AnyAsync(p => p.TenantId == tenantId, cancellationToken);

            if (alreadyHasPermissions) return;

            var roles = await _roleManager.Roles
                .AsNoTracking()
                .Where(r => r.Name != null)
                .ToDictionaryAsync(r => r.Name!, r => r.Id, StringComparer.OrdinalIgnoreCase, cancellationToken);

            var toAdd = new List<RolePermission>();

            // Admin: full pharmacy management permissions; Roles/Permissions stays restricted to SystemAdmin by default
            if (roles.TryGetValue("Admin", out var adminRoleId))
            {
                foreach (var mod in AllModules)
                {
                    bool isRolesModule = mod.Equals("Roles", StringComparison.OrdinalIgnoreCase);
                    toAdd.Add(new RolePermission
                    {
                        TenantId = tenantId,
                        RoleId = adminRoleId,
                        ModuleName = mod,
                        CanView = !isRolesModule,
                        CanCreate = !isRolesModule,
                        CanEdit = !isRolesModule,
                        CanDelete = !isRolesModule
                    });
                }
            }

            // Manager: branch operations + inventory + non-financial reports
            if (roles.TryGetValue("Manager", out var managerRoleId))
            {
                var managerModules = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "Dashboard", "Medicines", "Purchases", "Sales", "Parties",
                    "Due Collection", "Inventory", "Reports", "Sales Reports",
                    "Purchase Reports", "Inventory Reports", "Expiry Reports",
                    "Top Selling Reports", "Low Stock Reports", "Ledger Reports", "Master Data"
                };

                foreach (var mod in AllModules.Where(m => managerModules.Contains(m)))
                {
                    toAdd.Add(new RolePermission
                    {
                        TenantId = tenantId,
                        RoleId = managerRoleId,
                        ModuleName = mod,
                        CanView = true,
                        CanCreate = true,
                        CanEdit = true,
                        CanDelete = false
                    });
                }
            }

            // Cashier: POS, customers, due collection, medicine catalog read
            if (roles.TryGetValue("Cashier", out var cashierRoleId))
            {
                var cashierRules = new Dictionary<string, (bool Create, bool Edit)>(StringComparer.OrdinalIgnoreCase)
                {
                    ["Dashboard"] = (false, false),
                    ["Medicines"] = (false, false),
                    ["Sales"] = (true, false),
                    ["Parties"] = (true, false),
                    ["Due Collection"] = (true, false)
                };

                foreach (var mod in AllModules.Where(m => cashierRules.ContainsKey(m)))
                {
                    var (canCreate, canEdit) = cashierRules[mod];
                    toAdd.Add(new RolePermission
                    {
                        TenantId = tenantId,
                        RoleId = cashierRoleId,
                        ModuleName = mod,
                        CanView = true,
                        CanCreate = canCreate,
                        CanEdit = canEdit,
                        CanDelete = false
                    });
                }
            }

            if (toAdd.Count > 0)
            {
                await _context.RolePermissions.AddRangeAsync(toAdd, cancellationToken);
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        // All system modules — used for SystemAdmin full-access grant
        private static readonly string[] AllModules =
        {
            "Dashboard", "Medicines", "Purchases", "Sales", "Parties",
            "Due Collection", "Inventory", "Reports", "Sales Reports",
            "Purchase Reports", "Inventory Reports", "Financial Reports",
            "Expiry Reports", "Top Selling Reports", "Low Stock Reports",
            "Ledger Reports", "User Performance Reports", "VAT Reports",
            "Users", "Roles", "Settings", "Master Data"
        };

        public async Task<IEnumerable<PermissionDto>> GetEffectivePermissionsAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return Enumerable.Empty<PermissionDto>();

            var roles = await _userManager.GetRolesAsync(user);
            if (!roles.Any()) return Enumerable.Empty<PermissionDto>();

            // SystemAdmin gets full access to all modules automatically
            if (roles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
            {
                return AllModules.Select(m => new PermissionDto
                {
                    ModuleName = m,
                    CanView = true,
                    CanCreate = true,
                    CanEdit = true,
                    CanDelete = true
                }).ToList();
            }

            // Fail-closed: non-SystemAdmin users without a valid TenantId must receive zero permissions
            if (!user.TenantId.HasValue || user.TenantId.Value <= 0)
                return Enumerable.Empty<PermissionDto>();

            var targetTenantId = user.TenantId.Value;

            var roleIds = await _roleManager.Roles
                .Where(r => roles.Contains(r.Name!))
                .Select(r => r.Id)
                .ToListAsync();

            if (!roleIds.Any()) return Enumerable.Empty<PermissionDto>();

            // ARCHITECTURAL INTENT: GetEffectivePermissionsAsync is invoked both anonymously at /api/Auth/login
            // (where _ctx.TenantId == null) and inside authenticated filters ([ModulePermission]).
            // IgnoreQueryFilters() prevents the login-time `TenantId = NULL` query-filter lockout, while explicit
            // `p.TenantId == targetTenantId` enforces strict tenant isolation. NEVER remove `p.TenantId == targetTenantId`.
            var permissions = await _context.RolePermissions
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(p => p.TenantId == targetTenantId && roleIds.Contains(p.RoleId))
                .ToListAsync();

            // Group by module and take the maximum permission (OR logic)
            return permissions
                .GroupBy(p => p.ModuleName)
                .Select(g => new PermissionDto
                {
                    ModuleName = g.Key,
                    CanView = g.Any(p => p.CanView),
                    CanCreate = g.Any(p => p.CanCreate),
                    CanEdit = g.Any(p => p.CanEdit),
                    CanDelete = g.Any(p => p.CanDelete)
                }).ToList();
        }

        public async Task<IdentityResult> AssignUserRoleAsync(string userId, string newRole)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return IdentityResult.Failed(new IdentityError { Description = "User not found" });

            if (!await _roleManager.RoleExistsAsync(newRole))
                return IdentityResult.Failed(new IdentityError { Description = "Role does not exist" });

            // Protect SystemAdmin user — cannot be moved out of SystemAdmin role via this method
            var currentRoles = await _userManager.GetRolesAsync(user);
            if (currentRoles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
                return IdentityResult.Failed(new IdentityError { Description = "SystemAdmin user's role cannot be changed from this endpoint." });

            // Block assigning SystemAdmin role via general endpoint
            if (newRole.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase))
                return IdentityResult.Failed(new IdentityError { Description = "SystemAdmin role can only be assigned by a SystemAdmin." });

            await _userManager.RemoveFromRolesAsync(user, currentRoles);
            return await _userManager.AddToRoleAsync(user, newRole);
        }

        public async Task<bool> IsUserSystemAdminAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;
            var roles = await _userManager.GetRolesAsync(user);
            return roles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase));
        }

        public async Task<(bool Valid, string? ErrorMessage)> ValidateTenantBranchAssignmentAsync(
            int tenantId,
            int? branchId,
            CancellationToken cancellationToken = default)
        {
            var (tenant, branch) = await FetchTenantAndBranchAsync(tenantId, branchId, cancellationToken);

            if (tenant == null)
                return (false, "Invalid TenantId.");

            if (!tenant.IsActive)
                return (false, "Target tenant is inactive.");

            if (branchId.HasValue && branchId.Value > 0)
            {
                if (branch == null)
                    return (false, "Invalid BranchId for the specified tenant.");

                if (!branch.IsActive)
                    return (false, "Target branch is inactive.");
            }

            return (true, null);
        }

        public async Task<(bool Allowed, string? DenialReason)> ValidateUserLoginEligibilityAsync(
            ApplicationUser user,
            IList<string> roles,
            CancellationToken cancellationToken = default)
        {
            if (!user.IsActive)
                return (false, "Your account has been deactivated. Please contact your administrator.");

            // SystemAdmin operates at platform level and must not be locked out by tenant/branch state.
            if (roles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
                return (true, null);

            if (!user.TenantId.HasValue || user.TenantId.Value <= 0)
                return (false, "Account is not assigned to an active pharmacy.");

            var (tenant, branch) = await FetchTenantAndBranchAsync(user.TenantId.Value, user.BranchId, cancellationToken);

            if (tenant == null || !tenant.IsActive)
                return (false, "Your pharmacy account is inactive or suspended. Please contact support.");

            if (tenant.SubscriptionExpiry.HasValue)
            {
                var bdToday = TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.UtcNow,
                    TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time")).Date;

                if (tenant.SubscriptionExpiry.Value.Date < bdToday)
                    return (false, "Your pharmacy subscription has expired. Please renew to continue.");
            }

            if (user.BranchId.HasValue && user.BranchId.Value > 0 && (branch == null || !branch.IsActive))
                return (false, "Your assigned branch is currently inactive. Please contact your pharmacy admin.");

            return (true, null);
        }

        public static async Task PromoteLegacyTenantAdminIfMissingAsync(
            UserManager<ApplicationUser> userManager,
            ApplicationDbContext context,
            CancellationToken cancellationToken = default)
        {
            // ARCHITECTURAL INTENT: Never promote a platform SystemAdmin (TenantId == null)
            // into the Tenant-scoped Admin role on startup. Only promote legacy Tenant-assigned users.
            var admins = await userManager.GetUsersInRoleAsync("Admin");
            if (admins.Any())
                return;

            var candidates = await context.Users
                .IgnoreQueryFilters()
                .Where(u => u.TenantId != null)
                .OrderBy(u => u.Id)
                .ToListAsync(cancellationToken);

            foreach (var candidate in candidates)
            {
                if (!await userManager.IsInRoleAsync(candidate, "SystemAdmin"))
                {
                    await userManager.AddToRoleAsync(candidate, "Admin");
                    break;
                }
            }
        }

        private async Task<(Tenant? Tenant, Branch? Branch)> FetchTenantAndBranchAsync(
            int tenantId,
            int? branchId,
            CancellationToken cancellationToken)
        {
            var tenant = await _context.Tenants
                .IgnoreQueryFilters()
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantId == tenantId, cancellationToken);

            Branch? branch = null;
            if (tenant != null && branchId.HasValue && branchId.Value > 0)
            {
                branch = await _context.Branches
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b => b.BranchId == branchId.Value && b.TenantId == tenantId, cancellationToken);
            }

            return (tenant, branch);
        }
    }
}
