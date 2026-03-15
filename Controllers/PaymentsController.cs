using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.Models;
using PharmacyApi.DTOs;

namespace PharmacyApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PaymentsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: api/Payments/SalesDues
        [HttpGet("SalesDues")]
        public async Task<ActionResult<IEnumerable<object>>> GetSalesDues()
        {
            return await _context.SalesMasters
                .Where(s => s.DueAmount > 0)
                .Select(s => new
                {
                    s.SaleId,
                    s.CustomerName,
                    s.CustomerPhone,
                    s.SaleDate,
                    s.GrandTotal,
                    s.PaidAmount,
                    s.DueAmount,
                    s.PaymentStatus
                })
                .OrderByDescending(s => s.SaleDate)
                .ToListAsync();
        }

        // GET: api/Payments/PurchaseDues
        [HttpGet("PurchaseDues")]
        public async Task<ActionResult<IEnumerable<object>>> GetPurchaseDues()
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
                .ToListAsync();
        }

        // POST: api/Payments/CollectSalesDue
        [HttpPost("CollectSalesDue")]
        public async Task<IActionResult> CollectSalesDue([FromBody] SalesPaymentDto paymentDto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var sale = await _context.SalesMasters.FindAsync(paymentDto.SaleId);
                    if (sale == null) return NotFound("Sale not found");

                    if (paymentDto.Amount <= 0) return BadRequest("Payment amount must be greater than 0");
                    if (paymentDto.Amount > sale.DueAmount) return BadRequest("Payment amount exceeds due amount");

                    var payment = new SalesPayment
                    {
                        SaleId = paymentDto.SaleId,
                        PaymentMethod = paymentDto.PaymentMethod,
                        Amount = paymentDto.Amount,
                        AccountNumber = paymentDto.AccountNumber,
                        TransactionId = paymentDto.TransactionId,
                        Remarks = paymentDto.Remarks,
                        CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"))
                    };

                    _context.SalesPayments.Add(payment);

                    // Update Sale totals
                    sale.PaidAmount += paymentDto.Amount;
                    sale.DueAmount -= paymentDto.Amount;

                    if (sale.DueAmount <= 0) sale.PaymentStatus = "Paid";
                    else sale.PaymentStatus = "Partial";

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { Message = "Payment recorded successfully", NewDue = sale.DueAmount });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return BadRequest($"Error recording payment: {ex.Message}");
                }
            });
        }

        // POST: api/Payments/PayPurchaseDue
        [HttpPost("PayPurchaseDue")]
        public async Task<IActionResult> PayPurchaseDue([FromBody] PurchasePaymentDto paymentDto)
        {
            // PurchasePaymentDto needs to be checked/created in DTOs if not exists
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var purchase = await _context.PurchaseMasters.FindAsync(paymentDto.PurchaseId);
                    if (purchase == null) return NotFound("Purchase not found");

                    if (paymentDto.Amount <= 0) return BadRequest("Payment amount must be greater than 0");
                    if (paymentDto.Amount > purchase.DueAmount) return BadRequest("Payment amount exceeds due amount");

                    var payment = new PurchasePayment
                    {
                        PurchaseId = paymentDto.PurchaseId,
                        PaymentMethod = paymentDto.PaymentMethod,
                        Amount = paymentDto.Amount,
                        AccountNumber = paymentDto.AccountNumber,
                        TransactionId = paymentDto.TransactionId,
                        Remarks = paymentDto.Remarks,
                        CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"))
                    };

                    _context.PurchasePayments.Add(payment);

                    // Update Purchase totals
                    purchase.PaidAmount += paymentDto.Amount;
                    purchase.DueAmount -= paymentDto.Amount;

                    if (purchase.DueAmount <= 0) purchase.PaymentStatus = "Paid";
                    else purchase.PaymentStatus = "Partial";

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new { Message = "Payment recorded successfully", NewDue = purchase.DueAmount });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return BadRequest($"Error recording payment: {ex.Message}");
                }
            });
        }

        // GET: api/Payments/SalesHistory/{saleId}
        [HttpGet("SalesHistory/{saleId}")]
        public async Task<ActionResult<IEnumerable<SalesPayment>>> GetSalesHistory(int saleId)
        {
            return await _context.SalesPayments
                .Where(p => p.SaleId == saleId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        // GET: api/Payments/PurchaseHistory/{purchaseId}
        [HttpGet("PurchaseHistory/{purchaseId}")]
        public async Task<ActionResult<IEnumerable<PurchasePayment>>> GetPurchaseHistory(int purchaseId)
        {
            return await _context.PurchasePayments
                .Where(p => p.PurchaseId == purchaseId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }
    }
}
