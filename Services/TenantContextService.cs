using System.Security.Claims;

namespace PharmacyApi.Services
{
    public class TenantContextService : ITenantContextService
    {
        public int?  TenantId             { get; }
        public int?  BranchId             { get; }
        public bool  IsSystemAdmin        { get; }
        public bool  CanAccessAllBranches => TenantId.HasValue && !BranchId.HasValue;

        public TenantContextService(IHttpContextAccessor httpContextAccessor)
        {
            var user = httpContextAccessor.HttpContext?.User;
            if (user == null || !user.Identity?.IsAuthenticated == true) return;

            IsSystemAdmin = user.IsInRole("SystemAdmin");

            if (int.TryParse(user.FindFirst("TenantId")?.Value, out var tid) && tid > 0)
                TenantId = tid;

            if (int.TryParse(user.FindFirst("BranchId")?.Value, out var bid) && bid > 0)
                BranchId = bid;
        }
    }
}
