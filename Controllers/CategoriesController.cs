using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly IRepository<Category, CategoryDto> _repo;

        public CategoriesController(IRepository<Category, CategoryDto> repo)
        {
            _repo = repo;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll()
        {
            try { return Ok(await _repo.GetAllAsync()); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpGet("next-code/{prefix}")]
        public async Task<IActionResult> GetNextCode(string prefix)
        {
            try { return Ok(new { code = await _repo.GetNextCodeAsync(prefix) }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<CategoryDto>> GetById(int id)
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
        public async Task<ActionResult<CategoryDto>> Create(CategoryDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { message = "Validation failed", errors });
            }
            try
            {
                var created = await _repo.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.CategoryId }, created);
            }
            catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
            catch (Exception ex) { return StatusCode(500, ex.Message); }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, CategoryDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage);
                return BadRequest(new { message = "Validation failed", errors });
            }
            if (id != dto.CategoryId) return BadRequest("ID mismatch.");
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
