using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Repositories;
using PharmacyApi.Filters;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MedicinesController : ControllerBase
    {
        private readonly IMedicineRepository _repo;

        public MedicinesController(IMedicineRepository repo)
        {
            _repo = repo;
        }

        [HttpGet]
        [ModulePermission("Medicines", "view")]
        public async Task<ActionResult<PagedResult<MedicineDto>>> GetMedicines([FromQuery] MedicineSearchParameters parms)
        {
            try
            {
                var result = await _repo.GetPagedAsync(parms);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching medicines.", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [ModulePermission("Medicines", "view")]
        public async Task<ActionResult<MedicineDto>> GetMedicine(int id)
        {
            try
            {
                var m = await _repo.GetByIdAsync(id);
                if (m == null) return NotFound();
                return Ok(m);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching medicine details.", error = ex.Message });
            }
        }

        [HttpPost]
        [ModulePermission("Medicines", "create")]
        public async Task<ActionResult<MedicineDto>> PostMedicine(MedicineDto medicineDto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (await _repo.ExistsByNameAsync(medicineDto.Name))
                    return BadRequest(new { message = "A medicine with this name already exists." });

                var username = User.Identity?.Name ?? "System";
                var result = await _repo.CreateAsync(medicineDto, username);

                return CreatedAtAction("GetMedicine", new { id = result.MedicineId }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating medicine.", error = ex.Message });
            }
        }

        [HttpPut("{id}")]
        [ModulePermission("Medicines", "edit")]
        public async Task<IActionResult> PutMedicine(int id, MedicineDto medicineDto)
        {
            try
            {
                if (id != medicineDto.MedicineId) return BadRequest(new { message = "ID mismatch." });

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                if (await _repo.ExistsByNameAsync(medicineDto.Name, id))
                    return BadRequest(new { message = "Another medicine with this name already exists." });

                var username = User.Identity?.Name ?? "System";
                var success = await _repo.UpdateAsync(id, medicineDto, username);
                
                if (!success) return NotFound();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating medicine.", error = ex.Message });
            }
        }

        [HttpGet("next-code")]
        [ModulePermission("Medicines", "view")]
        public async Task<ActionResult<string>> GetNextCode()
        {
            try
            {
                var code = await _repo.GetNextCodeAsync();
                return Ok(new { code });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error generating next code.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [ModulePermission("Medicines", "delete")]
        public async Task<IActionResult> DeleteMedicine(int id)
        {
            try
            {
                var success = await _repo.DeleteAsync(id);
                if (!success) return NotFound();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting medicine.", error = ex.Message });
            }
        }
        [HttpPatch("{id}/toggle-status")]
        [ModulePermission("Medicines", "edit")]
        public async Task<IActionResult> ToggleStatus(int id)
        {
            try
            {
                var med = await _repo.GetByIdAsync(id);
                if (med == null) return NotFound();

                med.IsActive = !med.IsActive;
                var username = User.Identity?.Name ?? "System";
                var success = await _repo.UpdateAsync(id, med, username);

                if (!success) return NotFound();
                return Ok(new { isActive = med.IsActive });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error toggling status.", error = ex.Message });
            }
        }

        [HttpGet("check-batch/{medicineId}/{batchNumber}")]
        [ModulePermission("Medicines", "view")]
        public async Task<ActionResult<bool>> CheckBatch(int medicineId, string batchNumber)
        {
            try
            {
                var exists = await _repo.BatchExistsAsync(medicineId, batchNumber);
                return Ok(exists);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error checking batch.", error = ex.Message });
            }
        }
    }
}
