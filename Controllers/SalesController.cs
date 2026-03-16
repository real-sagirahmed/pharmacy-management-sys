using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Repositories;

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
        public async Task<IActionResult> GetNextInvoiceCode()
        {
            var code = await _repo.GetNextInvoiceCodeAsync();
            return Ok(new { invoiceCode = code });
        }

        // GET: api/Sales/medicine-batches/{medicineId}
        [HttpGet("medicine-batches/{medicineId}")]
        public async Task<ActionResult<IEnumerable<SaleBatchInfoDto>>> GetMedicineBatches(int medicineId)
        {
            var batches = await _repo.GetBatchesForMedicineAsync(medicineId);
            return Ok(batches);
        }

        // GET: api/Sales?searchText=&fromDate=&toDate=&saleStatus=&pageNumber=1&pageSize=15
        [HttpGet]
        public async Task<ActionResult<PagedResult<SalesMasterDto>>> GetAll([FromQuery] SaleSearchParameters parameters)
        {
            var result = await _repo.GetPagedAsync(parameters);
            return Ok(result);
        }

        // GET: api/Sales/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<SalesMasterDto>> GetById(int id)
        {
            var sale = await _repo.GetByIdAsync(id);
            if (sale == null) return NotFound();
            return Ok(sale);
        }

        // POST: api/Sales — Completed Sale
        [HttpPost]
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

        // DELETE: api/Sales/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _repo.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
