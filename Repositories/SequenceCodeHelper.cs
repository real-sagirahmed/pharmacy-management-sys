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
            // Branch-locked users or header-selected multi-branch Admin MUST resolve to an active branch within tenantId.
            if (ctx.BranchId.HasValue && ctx.BranchId.Value > 0)
            {
                bool activeOwnedBranch = await db.Branches
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .AnyAsync(b => b.TenantId == tenantId && b.BranchId == ctx.BranchId.Value && b.IsActive, cancellationToken);
                if (!activeOwnedBranch)
                    throw new InvalidOperationException("নির্বাচিত শাখাটি বৈধ নয় বা এই ফার্মেসির সক্রিয় শাখা নয়।");

                return ctx.BranchId.Value;
            }

            if (requestedBranchId.HasValue && requestedBranchId.Value > 0)
            {
                bool validBranch = await db.Branches
                    .IgnoreQueryFilters()
                    .AsNoTracking()
                    .AnyAsync(b => b.TenantId == tenantId && b.BranchId == requestedBranchId.Value, cancellationToken);
                if (validBranch)
                    return requestedBranchId.Value;
            }

            var headOfficeId = await db.Branches
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(b => b.TenantId == tenantId && b.IsHeadOffice)
                .Select(b => b.BranchId)
                .FirstOrDefaultAsync(cancellationToken);

            if (headOfficeId > 0)
                return headOfficeId;

            var anyBranchId = await db.Branches
                .IgnoreQueryFilters()
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
