using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Repositories;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PurchasesController : ControllerBase
    {
        private readonly IPurchaseRepository _repo;

        public PurchasesController(IPurchaseRepository repo)
        {
            _repo = repo;
        }

        // GET: api/purchases/next-grn
        [HttpGet("next-grn")]
        public async Task<ActionResult<string>> GetNextGrn()
        {
            var code = await _repo.GetNextGrnCodeAsync();
            return Ok(new { grnCode = code });
        }

        // GET: api/purchases
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseMasterDto>>> GetPurchases()
        {
            var result = await _repo.GetAllAsync();
            return Ok(result);
        }

        // GET: api/purchases/paged
        [HttpGet("paged")]
        public async Task<ActionResult<PagedResult<PurchaseMasterDto>>> GetPaged([FromQuery] PurchaseSearchParameters parameters)
        {
            var result = await _repo.GetPagedAsync(parameters);
            return Ok(result);
        }

        // GET: api/purchases/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseMasterDto>> GetPurchase(int id)
        {
            var result = await _repo.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        // POST: api/purchases
        [HttpPost]
        public async Task<ActionResult<PurchaseMasterDto>> PostPurchase(PurchaseMasterDto purchaseDto)
        {
            try
            {
                if (!ModelState.IsValid) return BadRequest(ModelState);

                var username = User.Identity?.Name ?? "System";
                var result = await _repo.CreateAsync(purchaseDto, username);

                return CreatedAtAction(nameof(GetPurchase), new { id = result.PurchaseId }, result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Error saving GRN.", error = ex.Message });
            }
        }

        // DELETE: api/purchases/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePurchase(int id)
        {
            var success = await _repo.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
    }
}
