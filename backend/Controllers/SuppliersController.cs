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
    public class SuppliersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SuppliersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SupplierDto>>> GetSuppliers()
        {
            return await _context.Suppliers
                .Select(s => new SupplierDto
                {
                    SupplierId = s.SupplierId,
                    Name = s.Name,
                    ContactPerson = s.ContactPerson,
                    Phone = s.Phone,
                    Email = s.Email,
                    Address = s.Address,
                    IsActive = s.IsActive
                }).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SupplierDto>> GetSupplier(int id)
        {
            var s = await _context.Suppliers.FindAsync(id);

            if (s == null) return NotFound();

            return new SupplierDto
            {
                SupplierId = s.SupplierId,
                Name = s.Name,
                ContactPerson = s.ContactPerson,
                Phone = s.Phone,
                Email = s.Email,
                Address = s.Address,
                IsActive = s.IsActive
            };
        }

        [HttpPost]
        public async Task<ActionResult<SupplierDto>> PostSupplier(SupplierDto supplierDto)
        {
            var supplier = new Supplier
            {
                Name = supplierDto.Name,
                ContactPerson = supplierDto.ContactPerson,
                Phone = supplierDto.Phone,
                Email = supplierDto.Email,
                Address = supplierDto.Address,
                IsActive = true
            };

            _context.Suppliers.Add(supplier);
            await _context.SaveChangesAsync();

            supplierDto.SupplierId = supplier.SupplierId;
            return CreatedAtAction("GetSupplier", new { id = supplier.SupplierId }, supplierDto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutSupplier(int id, SupplierDto supplierDto)
        {
            if (id != supplierDto.SupplierId) return BadRequest();

            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null) return NotFound();

            supplier.Name = supplierDto.Name;
            supplier.ContactPerson = supplierDto.ContactPerson;
            supplier.Phone = supplierDto.Phone;
            supplier.Email = supplierDto.Email;
            supplier.Address = supplierDto.Address;
            supplier.IsActive = supplierDto.IsActive;

            _context.Entry(supplier).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSupplier(int id)
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null) return NotFound();

            _context.Suppliers.Remove(supplier);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
