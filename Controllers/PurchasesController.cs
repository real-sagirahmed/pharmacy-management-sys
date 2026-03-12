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
    public class PurchasesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public PurchasesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<PurchaseMasterDto>>> GetPurchases()
        {
            return await _context.PurchaseMasters
                .Include(p => p.Supplier)
                .Select(p => new PurchaseMasterDto
                {
                    PurchaseId = p.PurchaseId,
                    SupplierId = p.SupplierId,
                    SupplierName = p.Supplier != null ? p.Supplier.Name : string.Empty,
                    InvoiceNumber = p.InvoiceNumber,
                    PurchaseDate = p.PurchaseDate,
                    TotalAmount = p.TotalAmount
                }).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PurchaseMasterDto>> GetPurchase(int id)
        {
            var p = await _context.PurchaseMasters
                .Include(p => p.Supplier)
                .Include(p => p.PurchaseDetails)
                .ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(x => x.PurchaseId == id);

            if (p == null) return NotFound();

            return new PurchaseMasterDto
            {
                PurchaseId = p.PurchaseId,
                SupplierId = p.SupplierId,
                SupplierName = p.Supplier?.Name,
                InvoiceNumber = p.InvoiceNumber,
                PurchaseDate = p.PurchaseDate,
                TotalAmount = p.TotalAmount,
                PurchaseDetails = p.PurchaseDetails.Select(d => new PurchaseDetailDto
                {
                    PurchaseDetailId = d.PurchaseDetailId,
                    MedicineId = d.MedicineId,
                    MedicineName = d.Medicine?.Name,
                    BatchNumber = d.BatchNumber,
                    ExpiryDate = d.ExpiryDate,
                    Quantity = d.Quantity,
                    UnitCost = d.UnitCost,
                    Subtotal = d.Subtotal
                }).ToList()
            };
        }

        [HttpPost]
        public async Task<ActionResult<PurchaseMaster>> PostPurchase(PurchaseMasterDto purchaseDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var purchase = new PurchaseMaster
                {
                    SupplierId = purchaseDto.SupplierId,
                    InvoiceNumber = purchaseDto.InvoiceNumber,
                    PurchaseDate = purchaseDto.PurchaseDate,
                    TotalAmount = purchaseDto.TotalAmount
                };

                foreach (var item in purchaseDto.PurchaseDetails)
                {
                    var detail = new PurchaseDetail
                    {
                        MedicineId = item.MedicineId,
                        BatchNumber = item.BatchNumber,
                        ExpiryDate = item.ExpiryDate,
                        Quantity = item.Quantity,
                        UnitCost = item.UnitCost,
                        Subtotal = item.Subtotal
                    };
                    purchase.PurchaseDetails.Add(detail);

                    // Update Stock and Sync latest batch/expiry
                    var medicine = await _context.Medicines.FindAsync(item.MedicineId);
                    if (medicine != null)
                    {
                        medicine.StockQuantity += item.Quantity;
                        medicine.Batch = item.BatchNumber;
                        medicine.ExpiryDate = item.ExpiryDate;
                        medicine.PurchasePrice = item.UnitCost; // Optional: Sync latest cost
                    }
                }

                _context.PurchaseMasters.Add(purchase);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetPurchase", new { id = purchase.PurchaseId }, purchase);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return BadRequest("Error saving purchase.");
            }
        }
    }
}
