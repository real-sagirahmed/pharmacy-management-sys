using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Services;
using PharmacyApi.Filters;

namespace PharmacyApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserManagementService _userService;

        public UsersController(IUserManagementService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [ModulePermission("Users", "view")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpPost("create-by-admin")]
        [ModulePermission("Users", "create")]
        public async Task<IActionResult> CreateByAdmin([FromBody] CreateUserDto model)
        {
            var result = await _userService.CreateUserAsync(model);
            if (result.Succeeded) return Ok(new { Message = "User created successfully" });

            return BadRequest(result.Errors);
        }

        [HttpPatch("{id}/toggle-status")]
        [ModulePermission("Users", "edit")]
        public async Task<IActionResult> ToggleStatus(string id)
        {
            var success = await _userService.ToggleUserStatusAsync(id);
            if (success) return Ok(new { Message = "User status toggled successfully" });

            return NotFound("User not found, is SystemAdmin, or failed to update");
        }

        [HttpPut("{id}")]
        [ModulePermission("Users", "edit")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto model)
        {
            // Security Hardening: Only SystemAdmin can edit a SystemAdmin user
            var isTargetSystemAdmin = await _userService.IsUserSystemAdminAsync(id);
            if (isTargetSystemAdmin && !User.IsInRole("SystemAdmin"))
            {
                return Forbid(); // Non-SystemAdmins cannot edit a SystemAdmin
            }

            var result = await _userService.UpdateUserAsync(id, model);
            if (result.Succeeded) return Ok(new { Message = "User updated successfully" });

            return BadRequest(result.Errors);
        }

        [HttpDelete("{id}")]
        [ModulePermission("Users", "delete")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userService.DeleteUserAsync(id);
            if (result.Succeeded) return Ok(new { Message = "User deleted successfully" });

            return BadRequest(result.Errors);
        }

        // ─── Role Assignment ───

        [HttpPost("update-role")]
        [ModulePermission("Users", "edit")]
        public async Task<IActionResult> UpdateRole([FromBody] UpdateUserRoleDto model)
        {
            // Security Hardening: Only SystemAdmin can assign the SystemAdmin role
            if (model.NewRole.Equals("SystemAdmin", StringComparison.OrdinalIgnoreCase)
                && !User.IsInRole("SystemAdmin"))
            {
                return Forbid(); // 403
            }

            var result = await _userService.AssignUserRoleAsync(model.UserId, model.NewRole);
            if (result.Succeeded) return Ok(new { Message = "User role updated successfully" });

            return BadRequest(result.Errors);
        }

        // Only SystemAdmin can grant the SystemAdmin role to another user
        [HttpPost("assign-system-admin")]
        [Authorize(Roles = "SystemAdmin")]
        public async Task<IActionResult> AssignSystemAdmin([FromBody] string targetUserId)
        {
            var callerName = User.Identity?.Name ?? "Unknown";
            var result = await _userService.AssignUserRoleAsync(targetUserId, "SystemAdmin");
            if (result.Succeeded) return Ok(new { Message = $"User assigned as SystemAdmin by {callerName}." });

            return BadRequest(result.Errors);
        }

        // ─── Role Management ───

        [HttpGet("roles")]
        [ModulePermission("Roles", "view")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _userService.GetRolesAsync();
            return Ok(roles);
        }

        [HttpPost("roles")]
        [ModulePermission("Roles", "create")]
        public async Task<IActionResult> CreateRole([FromBody] string roleName)
        {
            var result = await _userService.CreateRoleAsync(roleName);
            if (result.Succeeded) return Ok(new { Message = "Role created successfully" });

            return BadRequest(result.Errors);
        }

        [HttpPut("roles/{roleId}")]
        [ModulePermission("Roles", "edit")]
        public async Task<IActionResult> UpdateRoleName(string roleId, [FromBody] string newName)
        {
            var result = await _userService.UpdateRoleAsync(roleId, newName);
            if (result.Succeeded) return Ok(new { Message = "Role updated successfully" });

            return BadRequest(result.Errors);
        }

        [HttpDelete("roles/{roleId}")]
        [ModulePermission("Roles", "delete")]
        public async Task<IActionResult> DeleteRole(string roleId)
        {
            var result = await _userService.DeleteRoleAsync(roleId);
            if (result.Succeeded) return Ok(new { Message = "Role deleted successfully" });

            return BadRequest(result.Errors);
        }

        // ─── Permission Management ───

        [HttpGet("permissions/{roleId}")]
        [ModulePermission("Roles", "view")]
        public async Task<IActionResult> GetPermissions(string roleId)
        {
            var permissions = await _userService.GetPermissionsByRoleAsync(roleId);
            return Ok(permissions);
        }

        [HttpPost("permissions/{roleId}")]
        [ModulePermission("Roles", "edit")]
        public async Task<IActionResult> UpdatePermissions(string roleId, [FromBody] List<PermissionDto> permissions)
        {
            await _userService.UpdatePermissionsAsync(roleId, permissions);
            return Ok(new { Message = "Permissions updated successfully" });
        }
    }
}
