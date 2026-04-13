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
        Task<IEnumerable<PermissionDto>> GetPermissionsByRoleAsync(string roleId);
        Task UpdatePermissionsAsync(string roleId, IEnumerable<PermissionDto> permissions);
        Task<IEnumerable<PermissionDto>> GetEffectivePermissionsAsync(string userId);
        Task<IdentityResult> AssignUserRoleAsync(string userId, string newRole);
        Task<bool> IsUserSystemAdminAsync(string userId);
    }

    public class UserManagementService : IUserManagementService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly ApplicationDbContext _context;

        public UserManagementService(
            UserManager<ApplicationUser> userManager,
            RoleManager<IdentityRole> roleManager,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            var users = await _userManager.Users.ToListAsync();
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
                    Roles = roles
                });
            }
            return userList;
        }

        public async Task<IdentityResult> CreateUserAsync(CreateUserDto model)
        {
            var user = new ApplicationUser
            {
                UserName = model.UserName,
                Email = model.Email,
                FullName = model.FullName,
                IsActive = true
            };

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

            // Protect SystemAdmin from being deactivated
            var userRoles = await _userManager.GetRolesAsync(user);
            if (userRoles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
                return false;

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

            // Protect SystemAdmin user from deletion
            var userRoles = await _userManager.GetRolesAsync(user);
            if (userRoles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
                return IdentityResult.Failed(new IdentityError { Description = "SystemAdmin user cannot be deleted." });

            return await _userManager.DeleteAsync(user);
        }

        public async Task<IdentityResult> UpdateUserAsync(string userId, UpdateUserDto model)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return IdentityResult.Failed(new IdentityError { Description = "User not found" });

            // Protect SystemAdmin user from accidental modification
            var userRoles = await _userManager.GetRolesAsync(user);
            if (userRoles.Any(r => r.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)))
            {
                // Note: We'll allow SystemAdmin to edit themselves, but block others in the controller.
                // This service method remains permissive but the controller will act as the gatekeeper.
            }

            user.FullName = model.FullName;
            user.Email = model.Email;
            
            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded && !string.IsNullOrWhiteSpace(model.Password))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                result = await _userManager.ResetPasswordAsync(user, token, model.Password);
            }

            return result;
        }

        public async Task<IEnumerable<PermissionDto>> GetPermissionsByRoleAsync(string roleId)
        {
            return await _context.RolePermissions
                .Where(p => p.RoleId == roleId)
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

        public async Task UpdatePermissionsAsync(string roleId, IEnumerable<PermissionDto> permissions)
        {
            var existing = await _context.RolePermissions.Where(p => p.RoleId == roleId).ToListAsync();
            _context.RolePermissions.RemoveRange(existing);

            var newPermissions = permissions.Select(p => new RolePermission
            {
                RoleId = roleId,
                ModuleName = p.ModuleName,
                CanView = p.CanView,
                CanCreate = p.CanCreate,
                CanEdit = p.CanEdit,
                CanDelete = p.CanDelete
            });

            await _context.RolePermissions.AddRangeAsync(newPermissions);
            await _context.SaveChangesAsync();
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

            var roleIds = await _roleManager.Roles
                .Where(r => roles.Contains(r.Name!))
                .Select(r => r.Id)
                .ToListAsync();

            var permissions = await _context.RolePermissions
                .Where(p => roleIds.Contains(p.RoleId))
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
    }
}
