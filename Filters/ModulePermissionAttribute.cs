using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using PharmacyApi.Services;
using System.Security.Claims;

namespace PharmacyApi.Filters
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
    public class ModulePermissionAttribute : TypeFilterAttribute
    {
        public ModulePermissionAttribute(string module, string action = "view")
            : base(typeof(ModulePermissionFilter))
        {
            Arguments = new object[] { module, action };
        }
    }

    public class ModulePermissionFilter : IAsyncAuthorizationFilter
    {
        private readonly string _module;
        private readonly string _action;
        private readonly IUserManagementService _userService;

        public ModulePermissionFilter(string module, string action, IUserManagementService userService)
        {
            _module = module;
            _action = action;
            _userService = userService;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            if (user == null || !user.Identity!.IsAuthenticated)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            // SystemAdmin always bypasses permission checks
            var isSystemAdmin = await _userService.IsUserSystemAdminAsync(userId);
            if (isSystemAdmin)
                return; // Authorization successful

            // Check specific module and action matrix
            var permissions = await _userService.GetEffectivePermissionsAsync(userId);
            
            var hasAccess = permissions.Any(p =>
                p.ModuleName == _module &&
                ((_action == "view" && p.CanView) ||
                 (_action == "create" && p.CanCreate) ||
                 (_action == "edit" && p.CanEdit) ||
                 (_action == "delete" && p.CanDelete))
            );

            if (!hasAccess)
            {
                // Return 403 Forbidden to block the API call
                context.Result = new ForbidResult();
            }
        }
    }
}
