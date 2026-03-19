using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class PurchaseRepository : IPurchaseRepository
    {
        private readonly ApplicationDbContext _context;
        private static readonly string _tz = "Bangladesh Standard Time";

        public PurchaseRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        private DateTime BdNow() =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(_tz));

        // ─── GRN Code Auto-Generation ───────────────────────────────────────
        public async Task<string> GetNextGrnCodeAsync()
        {
            var last = await _context.PurchaseMasters
                .Where(p => p.GrnCode.StartsWith("GRN-"))
                .OrderByDescending(p => p.PurchaseId)
                .Select(p => p.GrnCode)
                .FirstOrDefaultAsync();

            int next = 1;
            if (!string.IsNullOrEmpty(last))
            {
                var parts = last.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[1], out int num))
                    next = num + 1;
            }
            return $"GRN-{next:D5}";
        }

        // ─── Get All (for dropdowns / simple lists) ─────────────────────────
        public async Task<IEnumerable<PurchaseMasterDto>> GetAllAsync()
        {
            return await _context.PurchaseMasters
                .Include(p => p.Party)
                .OrderByDescending(p => p.PurchaseDate)
                .Select(p => new PurchaseMasterDto
                {
                    PurchaseId    = p.PurchaseId,
                    GrnCode       = p.GrnCode,
                    SupplierId    = p.PartyId,
                    SupplierName  = p.Party != null ? p.Party.FullName : string.Empty,
                    SupplierPhone = p.Party != null ? p.Party.Cell : string.Empty,
                    InvoiceNumber = p.InvoiceNumber,
                    InvoiceDate   = p.InvoiceDate,
                    PurchaseDate  = p.PurchaseDate,
                    SubTotal      = p.SubTotal,
                    TotalDiscount = p.TotalDiscount,
                    TotalTax      = p.TotalTax,
                    Adjustment    = p.Adjustment,
                    GrandTotal    = p.GrandTotal,
                    PaidAmount    = p.PaidAmount,
                    DueAmount     = p.DueAmount,
                    PaymentStatus = p.PaymentStatus
                }).ToListAsync();
        }

        // ─── Paged List ──────────────────────────────────────────────────────
        public async Task<PagedResult<PurchaseMasterDto>> GetPagedAsync(PurchaseSearchParameters parameters)
        {
            var query = _context.PurchaseMasters
                .Include(p => p.Party)
                .AsQueryable();

            if (!string.IsNullOrEmpty(parameters.SearchText))
            {
                var s = parameters.SearchText.ToLower();
                if (s == "due" || s == "বকেয়া")
                {
                    query = query.Where(p => p.DueAmount > 0);
                }
                else
                {
                    query = query.Where(p =>
                        p.GrnCode.ToLower().Contains(s) ||
                        p.InvoiceNumber.ToLower().Contains(s) ||
                        (p.Party != null && p.Party.FullName.ToLower().Contains(s)));
                }
            }

            if (parameters.FromDate.HasValue)
                query = query.Where(p => p.PurchaseDate >= parameters.FromDate.Value);

            if (parameters.ToDate.HasValue)
                query = query.Where(p => p.PurchaseDate <= parameters.ToDate.Value);

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(p => p.PurchaseDate)
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .Select(p => new PurchaseMasterDto
                {
                    PurchaseId    = p.PurchaseId,
                    GrnCode       = p.GrnCode,
                    SupplierId    = p.PartyId,
                    SupplierName  = p.Party != null ? p.Party.FullName : string.Empty,
                    SupplierPhone = p.Party != null ? p.Party.Cell : string.Empty,
                    InvoiceNumber = p.InvoiceNumber,
                    InvoiceDate   = p.InvoiceDate,
                    PurchaseDate  = p.PurchaseDate,
                    SubTotal      = p.SubTotal,
                    TotalDiscount = p.TotalDiscount,
                    TotalTax      = p.TotalTax,
                    Adjustment    = p.Adjustment,
                    GrandTotal    = p.GrandTotal,
                    PaidAmount    = p.PaidAmount,
                    DueAmount     = p.DueAmount,
                    PaymentStatus = p.PaymentStatus
                }).ToListAsync();

            return new PagedResult<PurchaseMasterDto>
            {
                Items      = items,
                TotalCount = totalCount,
                PageNumber = parameters.PageNumber,
                PageSize   = parameters.PageSize
            };
        }

        // ─── Get By ID (with full details) ──────────────────────────────────
        public async Task<PurchaseMasterDto?> GetByIdAsync(int id)
        {
            var p = await _context.PurchaseMasters
                .Include(p => p.Party)
                .Include(p => p.PurchaseDetails).ThenInclude(d => d.Medicine)
                .Include(p => p.PurchaseDetails).ThenInclude(d => d.Uom)
                .Include(p => p.PurchasePayments)
                .FirstOrDefaultAsync(x => x.PurchaseId == id);

            if (p == null) return null;

            return new PurchaseMasterDto
            {
                PurchaseId    = p.PurchaseId,
                GrnCode       = p.GrnCode,
                SupplierId    = p.PartyId,
                SupplierName  = p.Party?.FullName,
                SupplierPhone = p.Party?.Cell,
                InvoiceNumber = p.InvoiceNumber,
                InvoiceDate   = p.InvoiceDate,
                PurchaseDate  = p.PurchaseDate,
                SubTotal      = p.SubTotal,
                TotalDiscount = p.TotalDiscount,
                TotalTax      = p.TotalTax,
                Adjustment    = p.Adjustment,
                GrandTotal    = p.GrandTotal,
                PaidAmount    = p.PaidAmount,
                DueAmount     = p.DueAmount,
                PaymentStatus = p.PaymentStatus,
                PurchaseDetails = p.PurchaseDetails.Select(d => new PurchaseDetailDto
                {
                    PurchaseDetailId = d.PurchaseDetailId,
                    MedicineId       = d.MedicineId,
                    MedicineName     = d.Medicine?.Name,
                    BatchNumber      = d.BatchNumber,
                    ExpiryDate       = d.ExpiryDate,
                    Quantity         = d.Quantity,
                    UomId            = d.UomId,
                    UomName          = d.UomName,
                    UnitCost         = d.UnitCost,
                    DiscountPercent  = d.DiscountPercent,
                    DiscountAmount   = d.DiscountAmount,
                    TaxPercent       = d.TaxPercent,
                    TaxAmount        = d.TaxAmount,
                    SalePrice        = d.SalePrice,
                    LineTotal        = d.LineTotal
                }).ToList(),
                PurchasePayments = p.PurchasePayments.Select(pm => new PurchasePaymentDto
                {
                    PurchasePaymentId = pm.PurchasePaymentId,
                    PurchaseId        = pm.PurchaseId,
                    PaymentMethod     = pm.PaymentMethod,
                    Amount            = pm.Amount,
                    AccountNumber     = pm.AccountNumber,
                    TransactionId     = pm.TransactionId,
                    Remarks           = pm.Remarks,
                    CreatedAt         = pm.CreatedAt
                }).ToList()
            };
        }

        // ─── Create (with transaction) ───────────────────────────────────────
        public async Task<PurchaseMasterDto> CreateAsync(PurchaseMasterDto dto, string username)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var now = BdNow();
                    var grnCode = await GetNextGrnCodeAsync();

                    if (!string.IsNullOrEmpty(dto.InvoiceNumber))
                    {
                        var exists = await _context.PurchaseMasters
                            .AnyAsync(p => p.PartyId == dto.SupplierId && p.InvoiceNumber == dto.InvoiceNumber);
                        if (exists)
                            throw new InvalidOperationException($"Invoice Number '{dto.InvoiceNumber}' already exists for this supplier.");
                    }

                    var purchase = new PurchaseMaster
                    {
                        GrnCode       = grnCode,
                        PartyId       = dto.SupplierId,
                        InvoiceNumber = dto.InvoiceNumber,
                        InvoiceDate   = dto.InvoiceDate,
                        PurchaseDate  = dto.PurchaseDate,
                        SubTotal      = dto.SubTotal,
                        TotalDiscount = dto.TotalDiscount,
                        TotalTax      = dto.TotalTax,
                        Adjustment    = dto.Adjustment,
                        GrandTotal    = dto.GrandTotal,
                        PaidAmount    = dto.PaidAmount,
                        CreatedBy     = username
                    };

                    // Calculate DueAmount once from authoritative values
                    purchase.DueAmount = purchase.GrandTotal - purchase.PaidAmount;

                    if (purchase.DueAmount <= 0)
                        purchase.PaymentStatus = "Paid";
                    else if (purchase.PaidAmount > 0)
                        purchase.PaymentStatus = "Partial";
                    else
                        purchase.PaymentStatus = "Due";

                    foreach (var item in dto.PurchaseDetails)
                    {
                        var detail = new PurchaseDetail
                        {
                            MedicineId      = item.MedicineId,
                            BatchNumber     = item.BatchNumber,
                            ExpiryDate      = item.ExpiryDate,
                            Quantity        = item.Quantity,
                            UomId           = item.UomId,
                            UomName         = item.UomName,
                            UnitCost        = item.UnitCost,
                            DiscountPercent = item.DiscountPercent,
                            DiscountAmount  = item.DiscountAmount,
                            TaxPercent      = item.TaxPercent,
                            TaxAmount       = item.TaxAmount,
                            SalePrice       = item.SalePrice,
                            LineTotal       = item.LineTotal,
                            CreatedAt       = now
                        };
                        purchase.PurchaseDetails.Add(detail);

                        var medicine = await _context.Medicines.FindAsync(item.MedicineId);
                        if (medicine != null)
                        {
                            medicine.StockQuantity += item.Quantity;
                            medicine.Batch         = item.BatchNumber;
                            medicine.ExpiryDate    = item.ExpiryDate;
                            medicine.PurchasePrice = item.UnitCost;
                            if (item.SalePrice > 0)
                                medicine.SalePrice = item.SalePrice;
                            medicine.UpdatedAt = now;
                            medicine.UpdatedBy = username;
                            _context.Entry(medicine).State = EntityState.Modified;
                        }
                    }

                    foreach (var pm in dto.PurchasePayments)
                    {
                        purchase.PurchasePayments.Add(new PurchasePayment
                        {
                            PaymentMethod = pm.PaymentMethod,
                            Amount        = pm.Amount,
                            AccountNumber = pm.AccountNumber,
                            TransactionId = pm.TransactionId,
                            Remarks       = pm.Remarks
                        });
                    }

                    _context.PurchaseMasters.Add(purchase);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    dto.PurchaseId    = purchase.PurchaseId;
                    dto.GrnCode       = purchase.GrnCode;
                    dto.DueAmount     = purchase.DueAmount;
                    dto.PaymentStatus = purchase.PaymentStatus;
                    return dto;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // ─── Delete (with stock reversal) ────────────────────────────────────
        public async Task<bool> DeleteAsync(int id)
        {
            var p = await _context.PurchaseMasters
                .Include(p => p.PurchaseDetails)
                .Include(p => p.PurchasePayments)
                .FirstOrDefaultAsync(p => p.PurchaseId == id);

            if (p == null) return false;

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Protection: Do not allow deleting a purchase that has payments recorded in PurchasePayments
                    if (p.PurchasePayments.Any())
                    {
                        return false;
                    }

                    foreach (var item in p.PurchaseDetails)

                    {
                        var medicine = await _context.Medicines.FindAsync(item.MedicineId);
                        if (medicine != null)
                        {
                            medicine.StockQuantity -= item.Quantity;
                            _context.Entry(medicine).State = EntityState.Modified;
                        }
                    }

                    _context.PurchaseMasters.Remove(p);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    return false;
                }
            });
        }
    }
}
