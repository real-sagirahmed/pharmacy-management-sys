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
    public class SalesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public SalesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<SalesMasterDto>>> GetSales()
        {
            return await _context.SalesMasters
                .Select(s => new SalesMasterDto
                {
                    SaleId = s.SaleId,
                    CustomerName = s.CustomerName,
                    CustomerPhone = s.CustomerPhone,
                    SaleDate = s.SaleDate,
                    GrandTotal = s.GrandTotal,
                    Discount = s.Discount,
                    PaymentMethod = s.PaymentMethod
                }).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<SalesMasterDto>> GetSale(int id)
        {
            var s = await _context.SalesMasters
                .Include(s => s.SalesDetails)
                .ThenInclude(d => d.Medicine)
                .FirstOrDefaultAsync(x => x.SaleId == id);

            if (s == null) return NotFound();

            return new SalesMasterDto
            {
                SaleId = s.SaleId,
                CustomerName = s.CustomerName,
                CustomerPhone = s.CustomerPhone,
                SaleDate = s.SaleDate,
                GrandTotal = s.GrandTotal,
                Discount = s.Discount,
                PaymentMethod = s.PaymentMethod,
                SalesDetails = s.SalesDetails.Select(d => new SalesDetailDto
                {
                    SalesDetailId = d.SalesDetailId,
                    MedicineId = d.MedicineId,
                    MedicineName = d.Medicine?.Name,
                    Quantity = d.Quantity,
                    UnitPrice = d.UnitPrice,
                    Tax = d.Tax,
                    Subtotal = d.Subtotal
                }).ToList()
            };
        }

        [HttpPost]
        public async Task<ActionResult<SalesMaster>> PostSale(SalesMasterDto salesDto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var sale = new SalesMaster
                {
                    CustomerName = salesDto.CustomerName,
                    CustomerPhone = salesDto.CustomerPhone,
                    SaleDate = salesDto.SaleDate,
                    GrandTotal = salesDto.GrandTotal,
                    Discount = salesDto.Discount,
                    PaymentMethod = salesDto.PaymentMethod
                };

                foreach (var item in salesDto.SalesDetails)
                {
                    // Check Stock
                    var medicine = await _context.Medicines.FindAsync(item.MedicineId);
                    if (medicine == null || medicine.StockQuantity < item.Quantity)
                    {
                        return BadRequest($"Insufficient stock for {medicine?.Name ?? "Medicine"}");
                    }

                    var detail = new SalesDetail
                    {
                        MedicineId = item.MedicineId,
                        Quantity = item.Quantity,
                        UnitPrice = item.UnitPrice,
                        Tax = item.Tax,
                        Subtotal = item.Subtotal
                    };
                    sale.SalesDetails.Add(detail);

                    // Deduct Stock
                    medicine.StockQuantity -= item.Quantity;
                }

                _context.SalesMasters.Add(sale);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetSale", new { id = sale.SaleId }, sale);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                return BadRequest("Error saving sale.");
            }
        }
    }
}
