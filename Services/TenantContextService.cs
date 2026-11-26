using System.Security.Claims;

namespace PharmacyApi.Services
{
    public class TenantContextService : ITenantContextService
    {
        public int?  TenantId             { get; }
        public int?  BranchId             { get; }
        public bool  IsSystemAdmin        { get; }
        public bool  CanAccessAllBranches { get; }

        public TenantContextService(IHttpContextAccessor httpContextAccessor)
        {
            var httpContext = httpContextAccessor.HttpContext;
            var user = httpContext?.User;
            if (user == null || user.Identity?.IsAuthenticated != true) return;

            IsSystemAdmin = user.IsInRole("SystemAdmin");

            if (int.TryParse(user.FindFirst("TenantId")?.Value, out var tid) && tid > 0)
                TenantId = tid;

            int? jwtBranchId = int.TryParse(user.FindFirst("BranchId")?.Value, out var bid) && bid > 0
                ? bid
                : null;

            CanAccessAllBranches = TenantId.HasValue && !jwtBranchId.HasValue;

            // ARCHITECTURAL INTENT: Branch-locked staff (JWT BranchId != null) CANNOT override BranchId
            // via the X-Branch-Id header. Only multi-branch Tenant Admins (CanAccessAllBranches == true)
            // may switch active branch context via header; cross-tenant spoofing fails closed in DbContext/SequenceCodeHelper.
            if (jwtBranchId.HasValue)
            {
                BranchId = jwtBranchId.Value;
            }
            else if (!IsSystemAdmin &&
                     CanAccessAllBranches &&
                     httpContext!.Request.Headers.TryGetValue("X-Branch-Id", out var headerVal) &&
                     int.TryParse(headerVal.FirstOrDefault(), out var requestedBranchId) &&
                     requestedBranchId > 0)
            {
                BranchId = requestedBranchId;
            }
        }
    }
}
