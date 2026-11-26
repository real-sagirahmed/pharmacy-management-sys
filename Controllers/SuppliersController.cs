using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Filters;
using PharmacyApi.Repositories;

namespace PharmacyApi.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class SuppliersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IPartyRepository _partyRepo;

        public SuppliersController(ApplicationDbContext context, IPartyRepository partyRepo)
        {
            _context = context;
            _partyRepo = partyRepo;
        }

        // ARCHITECTURAL INTENT: Suppliers are stored uniformly in Parties (PartyType = "Supplier"),
        // never in the legacy standalone Suppliers table, so Purchase/Ledger/Reports share one source of truth.
        [ModulePermission("Parties", "view")]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<SupplierDto>>> GetSuppliers()
        {
            return await _context.Parties
                .AsNoTracking()
                .Where(p => p.PartyType == "Supplier" && p.IsActive)
                .OrderBy(p => p.FullName)
                .Select(s => new SupplierDto
                {
                    SupplierId    = s.PartyId,
                    Name          = s.FullName,
                    ContactPerson = s.FullName,
                    Phone         = s.Cell ?? string.Empty,
                    Email         = s.Email ?? string.Empty,
                    Address       = s.Address ?? string.Empty,
                    IsActive      = s.IsActive
                })
                .ToListAsync();
        }

        [ModulePermission("Parties", "view")]
        [HttpGet("{id}")]
        public async Task<ActionResult<SupplierDto>> GetSupplier(int id)
        {
            var s = await _context.Parties
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.PartyId == id && p.PartyType == "Supplier");

            if (s == null) return NotFound();

            return new SupplierDto
            {
                SupplierId    = s.PartyId,
                Name          = s.FullName,
                ContactPerson = s.FullName,
                Phone         = s.Cell ?? string.Empty,
                Email         = s.Email ?? string.Empty,
                Address       = s.Address ?? string.Empty,
                IsActive      = s.IsActive
            };
        }

        [ModulePermission("Parties", "create")]
        [HttpPost]
        public async Task<ActionResult<SupplierDto>> PostSupplier(SupplierDto supplierDto)
        {
            var partyDto = new PartyDto
            {
                PartyType = "Supplier",
                FullName  = supplierDto.Name,
                Cell      = supplierDto.Phone,
                Email     = supplierDto.Email,
                Address   = supplierDto.Address,
                IsActive  = true
            };

            var created = await _partyRepo.CreateAsync(partyDto);

            var result = new SupplierDto
            {
                SupplierId    = created.PartyId,
                Name          = created.FullName,
                ContactPerson = created.FullName,
                Phone         = created.Cell,
                Email         = created.Email ?? string.Empty,
                Address       = created.Address ?? string.Empty,
                IsActive      = created.IsActive
            };

            return CreatedAtAction(nameof(GetSupplier), new { id = result.SupplierId }, result);
        }

        [ModulePermission("Parties", "edit")]
        [HttpPut("{id}")]
        public async Task<IActionResult> PutSupplier(int id, SupplierDto supplierDto)
        {
            if (id != supplierDto.SupplierId) return BadRequest();

            var supplier = await _context.Parties
                .FirstOrDefaultAsync(p => p.PartyId == id && p.PartyType == "Supplier");
            if (supplier == null) return NotFound();

            supplier.FullName = supplierDto.Name;
            supplier.Cell     = supplierDto.Phone;
            supplier.Email    = supplierDto.Email;
            supplier.Address  = supplierDto.Address;
            supplier.IsActive = supplierDto.IsActive;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [ModulePermission("Parties", "delete")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteSupplier(int id)
        {
            var supplier = await _context.Parties
                .FirstOrDefaultAsync(p => p.PartyId == id && p.PartyType == "Supplier");
            if (supplier == null) return NotFound();

            bool hasPurchases = await _context.PurchaseMasters
                .IgnoreQueryFilters()
                .AsNoTracking()
                .AnyAsync(pm => pm.PartyId == id);
            if (hasPurchases)
            {
                supplier.IsActive = false;
                await _context.SaveChangesAsync();
                return NoContent();
            }

            _context.Parties.Remove(supplier);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
