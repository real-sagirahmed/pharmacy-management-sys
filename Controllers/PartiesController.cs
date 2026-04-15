using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Filters;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class PartiesController : ControllerBase
    {
        private readonly IPartyRepository _repo;

        public PartiesController(IPartyRepository repo)
        {
            _repo = repo;
        }

        [HttpGet]
        [ModulePermission("Parties", "view")]
        public async Task<ActionResult<IEnumerable<PartyDto>>> GetAll()
        {
            try { return Ok(await _repo.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpGet("search")]
        [ModulePermission("Parties", "view")]
        public async Task<ActionResult<IEnumerable<PartyDto>>> Search([FromQuery] string q, [FromQuery] string? type)
        {
            try
            {
                return Ok(await _repo.SearchAsync(q, type));
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpGet("next-code/{prefix}")]
        [ModulePermission("Parties", "view")]
        public async Task<IActionResult> GetNextCode(string prefix)
        {
            try { return Ok(new { code = await _repo.GetNextCodeAsync(prefix) }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpGet("{id:int}")]
        [ModulePermission("Parties", "view")]
        public async Task<ActionResult<PartyDto>> GetById(int id)
        {
            try
            {
                var dto = await _repo.GetByIdAsync(id);
                if (dto == null) return NotFound();
                return Ok(dto);
            }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpPost]
        [ModulePermission("Parties", "create")]
        public async Task<ActionResult<PartyDto>> Create(PartyDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { message = "Validation failed", errors });
            }
            try
            {
                var created = await _repo.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.PartyId }, created);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpPut("{id:int}")]
        [ModulePermission("Parties", "edit")]
        public async Task<IActionResult> Update(int id, PartyDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { message = "Validation failed", errors });
            }
            if (id != dto.PartyId) return BadRequest("ID mismatch.");
            try
            {
                var updated = await _repo.UpdateAsync(id, dto);
                if (!updated) return NotFound();
                return NoContent();
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpDelete("{id:int}")]
        [ModulePermission("Parties", "delete")]
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
