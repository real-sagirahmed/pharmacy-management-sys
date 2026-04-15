using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using PharmacyApi.DTOs;
using PharmacyApi.Repositories;
using PharmacyApi.Filters;

namespace PharmacyApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentRepository _paymentRepo;

        public PaymentsController(IPaymentRepository paymentRepo)
        {
            _paymentRepo = paymentRepo;
        }

        // GET: api/Payments/SalesDues
        [HttpGet("SalesDues")]
        [ModulePermission("Due Collection", "view")]
        public async Task<IActionResult> GetSalesDues()
        {
            var result = await _paymentRepo.GetSalesDuesAsync();
            return Ok(result);
        }

        // GET: api/Payments/PurchaseDues
        [HttpGet("PurchaseDues")]
        [ModulePermission("Due Collection", "view")]
        public async Task<IActionResult> GetPurchaseDues()
        {
            var result = await _paymentRepo.GetPurchaseDuesAsync();
            return Ok(result);
        }

        // POST: api/Payments/CollectSalesDue
        [HttpPost("CollectSalesDue")]
        [ModulePermission("Due Collection", "create")]
        public async Task<IActionResult> CollectSalesDue([FromBody] SalesPaymentDto paymentDto)
        {
            var (success, message, newDue) = await _paymentRepo.CollectSalesDueAsync(paymentDto);

            if (!success)
            {
                if (message.Contains("not found")) return NotFound(message);
                return BadRequest(message);
            }

            return Ok(new { Message = message, NewDue = newDue });
        }

        // POST: api/Payments/PayPurchaseDue
        [HttpPost("PayPurchaseDue")]
        [ModulePermission("Due Collection", "create")]
        public async Task<IActionResult> PayPurchaseDue([FromBody] PurchasePaymentDto paymentDto)
        {
            var (success, message, newDue) = await _paymentRepo.PayPurchaseDueAsync(paymentDto);

            if (!success)
            {
                if (message.Contains("not found")) return NotFound(message);
                return BadRequest(message);
            }

            return Ok(new { Message = message, NewDue = newDue });
        }

        // POST: api/Payments/BulkCollectSalesDue
        [HttpPost("BulkCollectSalesDue")]
        [ModulePermission("Due Collection", "create")]
        public async Task<IActionResult> BulkCollectSalesDue([FromBody] BulkSalesPaymentDto bulkDto)
        {
            var (success, message, newDue) = await _paymentRepo.BulkCollectSalesDueAsync(bulkDto);
            if (!success) return BadRequest(message);
            return Ok(new { Message = message, NewDue = newDue });
        }

        // POST: api/Payments/BulkPayPurchaseDue
        [HttpPost("BulkPayPurchaseDue")]
        [ModulePermission("Due Collection", "create")]
        public async Task<IActionResult> BulkPayPurchaseDue([FromBody] BulkPurchasePaymentDto bulkDto)
        {
            var (success, message, newDue) = await _paymentRepo.BulkPayPurchaseDueAsync(bulkDto);
            if (!success) return BadRequest(message);
            return Ok(new { Message = message, NewDue = newDue });
        }

        // GET: api/Payments/SalesHistory/{saleId}

        // GET: api/Payments/SalesHistory/{saleId}
        [HttpGet("SalesHistory/{saleId}")]
        [ModulePermission("Due Collection", "view")]
        public async Task<IActionResult> GetSalesHistory(int saleId)
        {
            var result = await _paymentRepo.GetSalesPaymentHistoryAsync(saleId);
            return Ok(result);
        }

        // GET: api/Payments/PurchaseHistory/{purchaseId}
        [HttpGet("PurchaseHistory/{purchaseId}")]
        [ModulePermission("Due Collection", "view")]
        public async Task<IActionResult> GetPurchaseHistory(int purchaseId)
        {
            var result = await _paymentRepo.GetPurchasePaymentHistoryAsync(purchaseId);
            return Ok(result);
        }
    }
}
