using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly IUserManagementService _userService;

        public UsersController(IUserManagementService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _userService.GetAllUsersAsync();
            return Ok(users);
        }

        [HttpPost("create-by-admin")]
        public async Task<IActionResult> CreateByAdmin([FromBody] CreateUserDto model)
        {
            var result = await _userService.CreateUserAsync(model);
            if (result.Succeeded) return Ok(new { Message = "User created successfully" });

            return BadRequest(result.Errors);
        }

        [HttpPatch("{id}/toggle-status")]
        public async Task<IActionResult> ToggleStatus(string id)
        {
            var success = await _userService.ToggleUserStatusAsync(id);
            if (success) return Ok(new { Message = "User status toggled successfully" });

            return NotFound("User not found or failed to update");
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserDto model)
        {
            var result = await _userService.UpdateUserAsync(id, model);
            if (result.Succeeded) return Ok(new { Message = "User updated successfully" });

            return BadRequest(result.Errors);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var result = await _userService.DeleteUserAsync(id);
            if (result.Succeeded) return Ok(new { Message = "User deleted successfully" });

            return BadRequest(result.Errors);
        }

        // ─── Role Management ───

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _userService.GetRolesAsync();
            return Ok(roles);
        }

        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] string roleName)
        {
            var result = await _userService.CreateRoleAsync(roleName);
            if (result.Succeeded) return Ok(new { Message = "Role created successfully" });

            return BadRequest(result.Errors);
        }

        [HttpPut("roles/{roleId}")]
        public async Task<IActionResult> UpdateRole(string roleId, [FromBody] string newName)
        {
            var result = await _userService.UpdateRoleAsync(roleId, newName);
            if (result.Succeeded) return Ok(new { Message = "Role updated successfully" });

            return BadRequest(result.Errors);
        }

        [HttpDelete("roles/{roleId}")]
        public async Task<IActionResult> DeleteRole(string roleId)
        {
            var result = await _userService.DeleteRoleAsync(roleId);
            if (result.Succeeded) return Ok(new { Message = "Role deleted successfully" });

            return BadRequest(result.Errors);
        }

        // ─── Permission Management ───

        [HttpGet("permissions/{roleId}")]
        public async Task<IActionResult> GetPermissions(string roleId)
        {
            var permissions = await _userService.GetPermissionsByRoleAsync(roleId);
            return Ok(permissions);
        }

        [HttpPost("permissions/{roleId}")]
        public async Task<IActionResult> UpdatePermissions(string roleId, [FromBody] List<PermissionDto> permissions)
        {
            await _userService.UpdatePermissionsAsync(roleId, permissions);
            return Ok(new { Message = "Permissions updated successfully" });
        }
    }
}
