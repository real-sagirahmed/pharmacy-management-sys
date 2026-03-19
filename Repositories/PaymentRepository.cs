using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly ApplicationDbContext _context;
        private static readonly string _tz = "Bangladesh Standard Time";

        public PaymentRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        private DateTime BdNow() =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(_tz));

        // ─── Sales Dues ──────────────────────────────────────────────────────
        public async Task<IEnumerable<object>> GetSalesDuesAsync()
        {
            return await _context.SalesMasters
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
            return await _context.PurchaseMasters
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
        public async Task<IEnumerable<SalesPaymentDto>> GetSalesPaymentHistoryAsync(int saleId)
        {
            return await _context.SalesPayments
                .Where(p => p.SaleId == saleId)
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
        public async Task<IEnumerable<PurchasePaymentDto>> GetPurchasePaymentHistoryAsync(int purchaseId)
        {
            return await _context.PurchasePayments
                .Where(p => p.PurchaseId == purchaseId)
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new PurchasePaymentDto
                {
                    PurchasePaymentId = p.PurchasePaymentId,
                    PurchaseId = p.PurchaseId,
                    PaymentMethod = p.PaymentMethod,
                    Amount = p.Amount,
                    AccountNumber = p.AccountNumber,
                    TransactionId = p.TransactionId,
                    Remarks = p.Remarks
                })
                .ToListAsync();
        }

        // ─── Collect Sales Due ───────────────────────────────────────────────
        public async Task<(bool Success, string Message, decimal NewDue)> CollectSalesDueAsync(SalesPaymentDto dto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var tx = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sale = await _context.SalesMasters.FindAsync(dto.SaleId);
                    if (sale == null) return (false, "Sale not found.", 0);
                    if (dto.Amount <= 0) return (false, "Payment amount must be greater than 0.", sale.DueAmount);
                    if (dto.Amount > sale.DueAmount) return (false, "Payment amount exceeds due amount.", sale.DueAmount);

                    _context.SalesPayments.Add(new SalesPayment
                    {
                        SaleId = dto.SaleId,
                        PaymentMethod = dto.PaymentMethod,
                        Amount = dto.Amount,
                        AccountNumber = dto.AccountNumber,
                        TransactionId = dto.TransactionId,
                        Remarks = dto.Remarks,
                        CreatedAt = BdNow()
                    });

                    sale.PaidAmount += dto.Amount;
                    sale.DueAmount -= dto.Amount;
                    sale.PaymentStatus = sale.DueAmount <= 0 ? "Paid" : "Partial";

                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                    return (true, "Payment recorded successfully.", sale.DueAmount);
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return (false, $"Error: {ex.Message}", 0);
                }
            });
        }

        // ─── Pay Purchase Due ────────────────────────────────────────────────
        public async Task<(bool Success, string Message, decimal NewDue)> PayPurchaseDueAsync(PurchasePaymentDto dto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var tx = await _context.Database.BeginTransactionAsync();
                try
                {
                    var purchase = await _context.PurchaseMasters.FindAsync(dto.PurchaseId);
                    if (purchase == null) return (false, "Purchase not found.", 0);
                    if (dto.Amount <= 0) return (false, "Payment amount must be greater than 0.", purchase.DueAmount);
                    if (dto.Amount > purchase.DueAmount) return (false, "Payment amount exceeds due amount.", purchase.DueAmount);

                    _context.PurchasePayments.Add(new PurchasePayment
                    {
                        PurchaseId = dto.PurchaseId,
                        PaymentMethod = dto.PaymentMethod,
                        Amount = dto.Amount,
                        AccountNumber = dto.AccountNumber,
                        TransactionId = dto.TransactionId,
                        Remarks = dto.Remarks,
                        CreatedAt = BdNow()
                    });

                    purchase.PaidAmount += dto.Amount;
                    purchase.DueAmount -= dto.Amount;
                    purchase.PaymentStatus = purchase.DueAmount <= 0 ? "Paid" : "Partial";

                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                    return (true, "Payment recorded successfully.", purchase.DueAmount);
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return (false, $"Error: {ex.Message}", 0);
                }
            });
        }

        // ─── Bulk Collect Sales Due ──────────────────────────────────────────
        public async Task<(bool Success, string Message, decimal NewDue)> BulkCollectSalesDueAsync(BulkSalesPaymentDto dto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var tx = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sale = await _context.SalesMasters.FindAsync(dto.SaleId);
                    if (sale == null) return (false, "Sale not found.", 0);

                    decimal totalPaying = dto.Payments.Sum(p => p.Amount);
                    if (totalPaying <= 0) return (false, "Total payment must be greater than 0.", sale.DueAmount);
                    if (totalPaying > sale.DueAmount + 0.01m) return (false, "Total payment exceeds due amount.", sale.DueAmount);

                    var now = BdNow();
                    foreach (var pDto in dto.Payments.Where(p => p.Amount > 0))
                    {
                        _context.SalesPayments.Add(new SalesPayment
                        {
                            SaleId = dto.SaleId,
                            PaymentMethod = pDto.PaymentMethod,
                            Amount = pDto.Amount,
                            AccountNumber = pDto.AccountNumber,
                            TransactionId = pDto.TransactionId,
                            Remarks = pDto.Remarks,
                            CreatedAt = now
                        });
                    }

                    sale.PaidAmount += totalPaying;
                    sale.DueAmount -= totalPaying;
                    sale.PaymentStatus = sale.DueAmount <= 0.01m ? "Paid" : "Partial";

                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                    return (true, "Bulk payments recorded successfully.", sale.DueAmount);
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return (false, $"Error: {ex.Message}", 0);
                }
            });
        }

        // ─── Bulk Pay Purchase Due ───────────────────────────────────────────
        public async Task<(bool Success, string Message, decimal NewDue)> BulkPayPurchaseDueAsync(BulkPurchasePaymentDto dto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var tx = await _context.Database.BeginTransactionAsync();
                try
                {
                    var purchase = await _context.PurchaseMasters.FindAsync(dto.PurchaseId);
                    if (purchase == null) return (false, "Purchase not found.", 0);

                    decimal totalPaying = dto.Payments.Sum(p => p.Amount);
                    if (totalPaying <= 0) return (false, "Total payment must be greater than 0.", purchase.DueAmount);
                    if (totalPaying > purchase.DueAmount + 0.01m) return (false, "Total payment exceeds due amount.", purchase.DueAmount);

                    var now = BdNow();
                    foreach (var pDto in dto.Payments.Where(p => p.Amount > 0))
                    {
                        _context.PurchasePayments.Add(new PurchasePayment
                        {
                            PurchaseId = dto.PurchaseId,
                            PaymentMethod = pDto.PaymentMethod,
                            Amount = pDto.Amount,
                            AccountNumber = pDto.AccountNumber,
                            TransactionId = pDto.TransactionId,
                            Remarks = pDto.Remarks,
                            CreatedAt = now
                        });
                    }

                    purchase.PaidAmount += totalPaying;
                    purchase.DueAmount -= totalPaying;
                    purchase.PaymentStatus = purchase.DueAmount <= 0.01m ? "Paid" : "Partial";

                    await _context.SaveChangesAsync();
                    await tx.CommitAsync();
                    return (true, "Bulk payments recorded successfully.", purchase.DueAmount);
                }
                catch (Exception ex)
                {
                    await tx.RollbackAsync();
                    return (false, $"Error: {ex.Message}", 0);
                }
            });
        }
    }
}
