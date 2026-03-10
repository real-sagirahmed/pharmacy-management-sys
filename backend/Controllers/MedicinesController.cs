using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class MedicinesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public MedicinesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MedicineDto>>> GetMedicines()
        {
            return await _context.Medicines
                .Select(m => new MedicineDto
                {
                    MedicineId = m.MedicineId,
                    Name = m.Name,
                    GenericName = m.GenericName,
                    Category = m.Category,
                    Price = m.Price,
                    StockQuantity = m.StockQuantity,
                    ExpiryDate = m.ExpiryDate,
                    IsActive = m.IsActive
                }).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<MedicineDto>> GetMedicine(int id)
        {
            var m = await _context.Medicines.FindAsync(id);

            if (m == null) return NotFound();

            return new MedicineDto
            {
                MedicineId = m.MedicineId,
                Name = m.Name,
                GenericName = m.GenericName,
                Category = m.Category,
                Price = m.Price,
                StockQuantity = m.StockQuantity,
                ExpiryDate = m.ExpiryDate,
                IsActive = m.IsActive
            };
        }

        [HttpPost]
        public async Task<ActionResult<MedicineDto>> PostMedicine(MedicineDto medicineDto)
        {
            var medicine = new Medicine
            {
                Name = medicineDto.Name,
                GenericName = medicineDto.GenericName,
                Category = medicineDto.Category,
                Price = medicineDto.Price,
                StockQuantity = medicineDto.StockQuantity,
                ExpiryDate = medicineDto.ExpiryDate,
                IsActive = true
            };

            _context.Medicines.Add(medicine);
            await _context.SaveChangesAsync();

            medicineDto.MedicineId = medicine.MedicineId;
            return CreatedAtAction("GetMedicine", new { id = medicine.MedicineId }, medicineDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutMedicine(int id, MedicineDto medicineDto)
        {
            if (id != medicineDto.MedicineId) return BadRequest();

            var medicine = await _context.Medicines.FindAsync(id);
            if (medicine == null) return NotFound();

            medicine.Name = medicineDto.Name;
            medicine.GenericName = medicineDto.GenericName;
            medicine.Category = medicineDto.Category;
            medicine.Price = medicineDto.Price;
            medicine.StockQuantity = medicineDto.StockQuantity;
            medicine.ExpiryDate = medicineDto.ExpiryDate;
            medicine.IsActive = medicineDto.IsActive;

            _context.Entry(medicine).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMedicine(int id)
        {
            var medicine = await _context.Medicines.FindAsync(id);
            if (medicine == null) return NotFound();

            _context.Medicines.Remove(medicine);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
