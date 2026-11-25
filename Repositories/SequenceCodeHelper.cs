using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Services;

namespace PharmacyApi.Repositories
{
    /// <summary>
    /// Shared tenant/branch resolution and numeric suffix sequence parsing for multi-branch document codes.
    /// </summary>
    internal static class SequenceCodeHelper
    {
        public static int ResolveTenantId(ITenantContextService ctx, int? requestedTenantId)
        {
            if (ctx.TenantId.HasValue && ctx.TenantId.Value > 0)
                return ctx.TenantId.Value;

            if (requestedTenantId.HasValue && requestedTenantId.Value > 0)
                return requestedTenantId.Value;

            return 1;
        }

        public static async Task<int> ResolveBranchIdAsync(
            ApplicationDbContext db,
            ITenantContextService ctx,
            int tenantId,
            int? requestedBranchId,
            CancellationToken cancellationToken = default)
        {
            // Branch-locked users must never spoof another branch via request payload.
            if (ctx.BranchId.HasValue && ctx.BranchId.Value > 0)
                return ctx.BranchId.Value;

            if (requestedBranchId.HasValue && requestedBranchId.Value > 0)
            {
                bool validBranch = await db.Branches
                    .AsNoTracking()
                    .AnyAsync(b => b.TenantId == tenantId && b.BranchId == requestedBranchId.Value, cancellationToken);
                if (validBranch)
                    return requestedBranchId.Value;
            }

            var headOfficeId = await db.Branches
                .AsNoTracking()
                .Where(b => b.TenantId == tenantId && b.IsHeadOffice)
                .Select(b => b.BranchId)
                .FirstOrDefaultAsync(cancellationToken);

            if (headOfficeId > 0)
                return headOfficeId;

            var anyBranchId = await db.Branches
                .AsNoTracking()
                .Where(b => b.TenantId == tenantId)
                .Select(b => b.BranchId)
                .FirstOrDefaultAsync(cancellationToken);

            return anyBranchId > 0 ? anyBranchId : 1;
        }

        public static int ComputeNextSequenceNumber(IEnumerable<string> existingCodes, string prefix)
        {
            int max = 0;
            foreach (var code in existingCodes)
            {
                if (string.IsNullOrEmpty(code) || !code.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    continue;

                var suffix = code[prefix.Length..];
                if (int.TryParse(suffix, out int num) && num > max)
                    max = num;
            }

            return max + 1;
        }
    }
}
