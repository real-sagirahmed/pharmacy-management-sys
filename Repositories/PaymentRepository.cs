using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Repositories
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantContextService _ctx;
        private static readonly string _tz = "Bangladesh Standard Time";

        public PaymentRepository(ApplicationDbContext context, ITenantContextService ctx)
        {
            _context = context;
            _ctx = ctx;
        }

        private DateTime BdNow() =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(_tz));

        private bool HasValidCallerScope() =>
            _ctx.IsSystemAdmin || (_ctx.TenantId.HasValue && _ctx.TenantId.Value > 0);

        // ARCHITECTURAL INTENT: Every read and mutation in PaymentRepository MUST scope parent
        // SalesMaster/PurchaseMaster records through these explicit tenant/branch queries and FirstOrDefaultAsync.
        // Never use FindAsync() here (ChangeTracker can leak tracked entities across tenant/branch boundaries)
        // and never query SalesPayments/PurchasePayments without verifying parent ownership.
        private IQueryable<SalesMaster> ScopedSalesQuery()
        {
            if (_ctx.IsSystemAdmin)
                return _context.SalesMasters;

            if (!_ctx.TenantId.HasValue || _ctx.TenantId.Value <= 0)
                return _context.SalesMasters.Where(_ => false);

            int tenantId = _ctx.TenantId.Value;
            return _ctx.BranchId.HasValue
                ? _context.SalesMasters.Where(s => s.TenantId == tenantId && s.BranchId == _ctx.BranchId.Value)
                : _context.SalesMasters.Where(s => s.TenantId == tenantId);
        }

        private IQueryable<PurchaseMaster> ScopedPurchasesQuery()
        {
            if (_ctx.IsSystemAdmin)
                return _context.PurchaseMasters;

            if (!_ctx.TenantId.HasValue || _ctx.TenantId.Value <= 0)
                return _context.PurchaseMasters.Where(_ => false);

            int tenantId = _ctx.TenantId.Value;
            return _ctx.BranchId.HasValue
                ? _context.PurchaseMasters.Where(p => p.TenantId == tenantId && p.BranchId == _ctx.BranchId.Value)
                : _context.PurchaseMasters.Where(p => p.TenantId == tenantId);
        }

        private static bool TryComputePaymentTotal<T>(
            IReadOnlyList<T>? payments,
            Func<T, decimal> amountSelector,
            decimal currentDue,
            bool allowRoundingTolerance,
            out decimal totalPaying,
            out string errorMessage)
        {
            totalPaying = 0m;
            errorMessage = string.Empty;

            if (payments == null || payments.Count == 0)
            {
                errorMessage = allowRoundingTolerance
                    ? "Total payment must be greater than 0."
                    : "Payment amount must be greater than 0.";
                return false;
            }

            foreach (var p in payments)
            {
                if (p == null) continue;
                var amount = amountSelector(p);
                if (amount < 0m)
                {
                    errorMessage = "Payment amount cannot be negative.";
                    return false;
                }
                totalPaying += amount;
            }

            if (totalPaying <= 0m)
            {
                errorMessage = allowRoundingTolerance
                    ? "Total payment must be greater than 0."
                    : "Payment amount must be greater than 0.";
                return false;
            }

            decimal maxAllowed = allowRoundingTolerance ? currentDue + 0.01m : currentDue;
            if (totalPaying > maxAllowed)
            {
                errorMessage = allowRoundingTolerance
                    ? "Total payment exceeds due amount."
                    : "Payment amount exceeds due amount.";
                return false;
            }

            return true;
        }

        // ─── Sales Dues ──────────────────────────────────────────────────────
        public async Task<IEnumerable<object>> GetSalesDuesAsync()
        {
            if (!HasValidCallerScope())
                return Array.Empty<object>();

            return await ScopedSalesQuery()
                .AsNoTracking()
                .Where(s => s.DueAmount > 0)
                .Select(s => new
                {
                    s.SaleId,
                    s.InvoiceCode,
                    s.CustomerName,
                    s.CustomerPhone,
                    s.SaleDate,
                    s.GrandTotal,
                    s.PaidAmount,
                    s.DueAmount,
                    s.PaymentStatus
                })
                .OrderByDescending(s => s.SaleDate)
                .ToListAsync<object>();
        }

        // ─── Purchase Dues ───────────────────────────────────────────────────
        public async Task<IEnumerable<object>> GetPurchaseDuesAsync()
        {
            if (!HasValidCallerScope())
                return Array.Empty<object>();

            return await ScopedPurchasesQuery()
                .AsNoTracking()
                .Where(p => p.DueAmount > 0)
                .Select(p => new
                {
                    p.PurchaseId,
                    p.GrnCode,
                    SupplierName = p.Party != null ? p.Party.FullName : "N/A",
                    p.PurchaseDate,
                    p.GrandTotal,
                    p.PaidAmount,
                    p.DueAmount,
                    p.PaymentStatus
                })
                .OrderByDescending(p => p.PurchaseDate)
                .ToListAsync<object>();
        }

        // ─── Sales Payment History ───────────────────────────────────────────
        public async Task<IEnumerable<SalesPaymentDto>?> GetSalesPaymentHistoryAsync(int saleId)
        {
            if (!HasValidCallerScope())
                return null;

            bool saleExists = await ScopedSalesQuery()
                .AsNoTracking()
                .AnyAsync(s => s.SaleId == saleId);
            if (!saleExists)
                return null;

            var query = _context.SalesPayments
                .AsNoTracking()
                .Where(p => p.SaleId == saleId && p.SalesMaster != null);

            if (!_ctx.IsSystemAdmin)
            {
                int tenantId = _ctx.TenantId!.Value;
                query = _ctx.BranchId.HasValue
                    ? query.Where(p => p.SalesMaster!.TenantId == tenantId && p.SalesMaster.BranchId == _ctx.BranchId.Value)
                    : query.Where(p => p.SalesMaster!.TenantId == tenantId);
            }

            return await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new SalesPaymentDto
                {
                    SalesPaymentId = p.SalesPaymentId,
                    SaleId = p.SaleId,
                    PaymentMethod = p.PaymentMethod,
                    Amount = p.Amount,
                    AccountNumber = p.AccountNumber,
                    TransactionId = p.TransactionId,
                    Remarks = p.Remarks,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();
        }

        // ─── Purchase Payment History ────────────────────────────────────────
        public async Task<IEnumerable<PurchasePaymentDto>?> GetPurchasePaymentHistoryAsync(int purchaseId)
        {
            if (!HasValidCallerScope())
                return null;

            bool purchaseExists = await ScopedPurchasesQuery()
                .AsNoTracking()
                .AnyAsync(p => p.PurchaseId == purchaseId);
            if (!purchaseExists)
                return null;

            var query = _context.PurchasePayments
                .AsNoTracking()
                .Where(p => p.PurchaseId == purchaseId && p.PurchaseMaster != null);

            if (!_ctx.IsSystemAdmin)
            {
                int tenantId = _ctx.TenantId!.Value;
                query = _ctx.BranchId.HasValue
                    ? query.Where(p => p.PurchaseMaster!.TenantId == tenantId && p.PurchaseMaster.BranchId == _ctx.BranchId.Value)
                    : query.Where(p => p.PurchaseMaster!.TenantId == tenantId);
            }

            return await query
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PurchasePaymentDto
                {
                    PurchasePaymentId = p.PurchasePaymentId,
                    PurchaseId = p.PurchaseId,
                    PaymentMethod = p.PaymentMethod,
                    Amount = p.Amount,
                    AccountNumber = p.AccountNumber,
                    TransactionId = p.TransactionId,
                    Remarks = p.Remarks,
                    CreatedAt = p.CreatedAt
                })
                .ToListAsync();
        }

        // ─── Collect Sales Due (Single & Bulk Unified) ───────────────────────
        public Task<(bool Success, string Message, decimal NewDue)> CollectSalesDueAsync(SalesPaymentDto dto) =>
            ApplySalesPaymentsAsync(dto.SaleId, new[] { dto }, isBulk: false);

        public Task<(bool Success, string Message, decimal NewDue)> BulkCollectSalesDueAsync(BulkSalesPaymentDto dto) =>
            ApplySalesPaymentsAsync(dto.SaleId, dto.Payments, isBulk: true);

        private async Task<(bool Success, string Message, decimal NewDue)> ApplySalesPaymentsAsync(
            int saleId,
            IReadOnlyList<SalesPaymentDto>? payments,
            bool isBulk)
        {
            if (!HasValidCallerScope())
                return (false, "Sale not found.", 0m);

            return await _context.ExecuteInTransactionAsync(async ct =>
            {
                await _context.AcquireTransactionAppLockAsync($"PAY_SALE_{saleId}", ct);

                var sale = await ScopedSalesQuery().FirstOrDefaultAsync(s => s.SaleId == saleId, ct);
                if (sale == null)
                    return (false, (false, "Sale not found.", 0m));

                if (!TryComputePaymentTotal(payments, p => p.Amount, sale.DueAmount, isBulk, out var totalPaying, out var error))
                    return (false, (false, error, sale.DueAmount));

                var now = BdNow();
                foreach (var pDto in payments!.Where(p => p != null && p.Amount > 0m))
                {
                    _context.SalesPayments.Add(new SalesPayment
                    {
                        SaleId = sale.SaleId,
                        PaymentMethod = pDto.PaymentMethod,
                        Amount = pDto.Amount,
                        AccountNumber = pDto.AccountNumber,
                        TransactionId = pDto.TransactionId,
                        Remarks = pDto.Remarks,
                        CreatedAt = now
                    });
                }

                sale.PaidAmount += totalPaying;
                decimal remainingDue = sale.DueAmount - totalPaying;
                bool isFullyPaid = isBulk ? remainingDue <= 0.01m : remainingDue <= 0m;
                sale.DueAmount = isFullyPaid ? 0m : remainingDue;
                sale.PaymentStatus = isFullyPaid ? "Paid" : "Partial";

                await _context.SaveChangesAsync(ct);
                return (true, (true, isBulk ? "Bulk payments recorded successfully." : "Payment recorded successfully.", sale.DueAmount));
            });
        }

        // ─── Pay Purchase Due (Single & Bulk Unified) ────────────────────────
        public Task<(bool Success, string Message, decimal NewDue)> PayPurchaseDueAsync(PurchasePaymentDto dto) =>
            ApplyPurchasePaymentsAsync(dto.PurchaseId, new[] { dto }, isBulk: false);

        public Task<(bool Success, string Message, decimal NewDue)> BulkPayPurchaseDueAsync(BulkPurchasePaymentDto dto) =>
            ApplyPurchasePaymentsAsync(dto.PurchaseId, dto.Payments, isBulk: true);

        private async Task<(bool Success, string Message, decimal NewDue)> ApplyPurchasePaymentsAsync(
            int purchaseId,
            IReadOnlyList<PurchasePaymentDto>? payments,
            bool isBulk)
        {
            if (!HasValidCallerScope())
                return (false, "Purchase not found.", 0m);

            return await _context.ExecuteInTransactionAsync(async ct =>
            {
                await _context.AcquireTransactionAppLockAsync($"PAY_PURCHASE_{purchaseId}", ct);

                var purchase = await ScopedPurchasesQuery().FirstOrDefaultAsync(p => p.PurchaseId == purchaseId, ct);
                if (purchase == null)
                    return (false, (false, "Purchase not found.", 0m));

                if (!TryComputePaymentTotal(payments, p => p.Amount, purchase.DueAmount, isBulk, out var totalPaying, out var error))
                    return (false, (false, error, purchase.DueAmount));

                var now = BdNow();
                foreach (var pDto in payments!.Where(p => p != null && p.Amount > 0m))
                {
                    _context.PurchasePayments.Add(new PurchasePayment
                    {
                        PurchaseId = purchase.PurchaseId,
                        PaymentMethod = pDto.PaymentMethod,
                        Amount = pDto.Amount,
                        AccountNumber = pDto.AccountNumber,
                        TransactionId = pDto.TransactionId,
                        Remarks = pDto.Remarks,
                        CreatedAt = now
                    });
                }

                purchase.PaidAmount += totalPaying;
                decimal remainingDue = purchase.DueAmount - totalPaying;
                bool isFullyPaid = isBulk ? remainingDue <= 0.01m : remainingDue <= 0m;
                purchase.DueAmount = isFullyPaid ? 0m : remainingDue;
                purchase.PaymentStatus = isFullyPaid ? "Paid" : "Partial";

                await _context.SaveChangesAsync(ct);
                return (true, (true, isBulk ? "Bulk payments recorded successfully." : "Payment recorded successfully.", purchase.DueAmount));
            });
        }
    }
}
