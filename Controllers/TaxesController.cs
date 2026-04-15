using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.Filters;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TaxesController : ControllerBase
    {
        private readonly IRepository<Tax, TaxDto> _repo;

        public TaxesController(IRepository<Tax, TaxDto> repo)
        {
            _repo = repo;
        }

        [ModulePermission("Master Data", "view")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaxDto>>> GetAll()
        {
            try { return Ok(await _repo.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [ModulePermission("Master Data", "view")]
        [HttpGet("next-code/{prefix}")]
        public async Task<IActionResult> GetNextCode(string prefix)
        {
            try { return Ok(new { code = await _repo.GetNextCodeAsync(prefix) }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [ModulePermission("Master Data", "view")]
        [HttpGet("{id:int}")]
        public async Task<ActionResult<TaxDto>> GetById(int id)
        {
            try
            {
                var dto = await _repo.GetByIdAsync(id);
                if (dto == null) return NotFound();
                return Ok(dto);
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [ModulePermission("Master Data", "create")]
        [HttpPost]
        public async Task<ActionResult<TaxDto>> Create(TaxDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { message = "Validation failed", errors });
            }
            try
            {
                var created = await _repo.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.TaxId }, created);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [ModulePermission("Master Data", "edit")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, TaxDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { message = "Validation failed", errors });
            }
            if (id != dto.TaxId) return BadRequest("ID mismatch.");
            try
            {
                var updated = await _repo.UpdateAsync(id, dto);
                if (!updated) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [ModulePermission("Master Data", "delete")]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var deleted = await _repo.DeleteAsync(id);
                if (!deleted) return NotFound();
                return NoContent();
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }
    }
}
