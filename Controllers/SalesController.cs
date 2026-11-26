using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Repositories;
using PharmacyApi.Filters;
using PharmacyApi.Services;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SalesController : ControllerBase
    {
        private readonly ISalesRepository _repo;

        public SalesController(ISalesRepository repo)
        {
            _repo = repo;
        }

        // GET: api/Sales/next-invoice-code
        [HttpGet("next-invoice-code")]
        [ModulePermission("Sales", "view")]
        public async Task<IActionResult> GetNextInvoiceCode([FromQuery] int? tenantId = null)
        {
            int? scopedTenantId = User.IsInRole("SystemAdmin") ? tenantId : null;
            var code = await _repo.GetNextInvoiceCodeAsync(scopedTenantId);
            return Ok(new { invoiceCode = code });
        }

        // GET: api/Sales/medicine-batches/{medicineId}
        [HttpGet("medicine-batches/{medicineId}")]
        [ModulePermission("Sales", "view")]
        public async Task<ActionResult<IEnumerable<SaleBatchInfoDto>>> GetMedicineBatches(int medicineId)
        {
            var batches = await _repo.GetBatchesForMedicineAsync(medicineId);
            return Ok(batches);
        }

        // GET: api/Sales?searchText=&fromDate=&toDate=&saleStatus=&pageNumber=1&pageSize=15
        [HttpGet]
        [ModulePermission("Sales", "view")]
        public async Task<ActionResult<PagedResult<SalesMasterDto>>> GetAll([FromQuery] SaleSearchParameters parameters)
        {
            var result = await _repo.GetPagedAsync(parameters);
            return Ok(result);
        }

        // GET: api/Sales/{id}
        [HttpGet("{id}")]
        [ModulePermission("Sales", "view")]
        public async Task<ActionResult<SalesMasterDto>> GetById(int id)
        {
            var sale = await _repo.GetByIdAsync(id);
            if (sale == null) return NotFound();
            return Ok(sale);
        }

        // POST: api/Sales — Completed Sale
        [HttpPost]
        [ModulePermission("Sales", "create")]
        public async Task<ActionResult<SalesMasterDto>> Create([FromBody] SalesMasterDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var created = await _repo.CreateAsync(dto, User.Identity?.Name ?? "System");
                return CreatedAtAction(nameof(GetById), new { id = created.SaleId }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Sales/hold — Hold Sale (does NOT deduct stock)
        [HttpPost("hold")]
        [ModulePermission("Sales", "create")]
        public async Task<ActionResult<SalesMasterDto>> Hold([FromBody] SalesMasterDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            try
            {
                var held = await _repo.HoldAsync(dto, User.Identity?.Name ?? "System");
                return Ok(held);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Sales/{id}/prescription — Attach verified prescription image
        [HttpPost("{id:int}/prescription")]
        [ModulePermission("Sales", "create")]
        public async Task<IActionResult> UploadPrescription(
            int id,
            IFormFile file,
            [FromServices] IWebHostEnvironment env,
            CancellationToken cancellationToken = default)
        {
            var (isValid, errorMsg, ext) = await ImageUploadValidator.ValidateAsync(file, ImageUploadValidator.DefaultMaxImageBytes, cancellationToken);
            if (!isValid) return BadRequest(errorMsg);

            var sale = await _repo.GetByIdAsync(id);
            if (sale == null) return NotFound();

            int tenantScope = sale.TenantId ?? 0;
            var fileName = $"rx-{id}-{Guid.NewGuid():N}{ext}";
            var relativePath = await ImageUploadValidator.SaveToWebRootAsync(
                file, env, fileName, cancellationToken, "uploads", "prescriptions", $"tenant-{tenantScope}");

            var updated = await _repo.SetPrescriptionImageAsync(id, relativePath, cancellationToken);
            if (!updated) return NotFound();

            return Ok(new { prescriptionImagePath = relativePath });
        }

        // DELETE: api/Sales/{id}
        [HttpDelete("{id}")]
        [ModulePermission("Sales", "delete")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _repo.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
