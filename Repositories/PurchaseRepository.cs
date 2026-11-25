using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Repositories
{
    public class PurchaseRepository : IPurchaseRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantContextService _ctx;
        private static readonly string _tz = "Bangladesh Standard Time";

        public PurchaseRepository(ApplicationDbContext context, ITenantContextService ctx)
        {
            _context = context;
            _ctx = ctx;
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
                    TenantId      = p.TenantId,
                    BranchId      = p.BranchId,
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
                    TenantId      = p.TenantId,
                    BranchId      = p.BranchId,
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
                TenantId      = p.TenantId,
                BranchId      = p.BranchId,
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

        // ─── Create (with transaction & MedicineBatch upsert) ────────────────
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

                    // Resolve TenantId & BranchId
                    int tenantId = _ctx.TenantId ?? (dto.TenantId.HasValue && dto.TenantId.Value > 0 ? dto.TenantId.Value : 1);
                    int branchId = dto.BranchId ?? _ctx.BranchId ?? 0;
                    if (branchId == 0)
                    {
                        var ho = await _context.Branches.FirstOrDefaultAsync(b => b.TenantId == tenantId && b.IsHeadOffice);
                        branchId = ho?.BranchId ?? (await _context.Branches.Where(b => b.TenantId == tenantId).Select(b => b.BranchId).FirstOrDefaultAsync());
                        if (branchId == 0) branchId = 1;
                    }

                    var purchase = new PurchaseMaster
                    {
                        GrnCode       = grnCode,
                        TenantId      = tenantId,
                        BranchId      = branchId,
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
                        CreatedBy     = username,
                        CreatedAt     = now
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

                        // ─── SaaS MedicineBatch Upsert (Branch-level batch stock) ───
                        var batchNumber = string.IsNullOrWhiteSpace(item.BatchNumber) ? "DEFAULT" : item.BatchNumber.Trim();
                        var batch = await _context.MedicineBatches
                            .FirstOrDefaultAsync(b => b.TenantId == tenantId &&
                                                      b.BranchId == branchId &&
                                                      b.MedicineId == item.MedicineId &&
                                                      b.BatchNumber == batchNumber);

                        if (batch != null)
                        {
                            batch.CurrentStock += item.Quantity;
                            if (item.ExpiryDate.HasValue) batch.ExpiryDate = item.ExpiryDate.Value;
                            batch.PurchasePrice = item.UnitCost;
                            if (item.SalePrice > 0) batch.SalePrice = item.SalePrice;
                            batch.Status = "Active"; // Reactivate if was zero
                        }
                        else
                        {
                            batch = new MedicineBatch
                            {
                                TenantId      = tenantId,
                                BranchId      = branchId,
                                MedicineId    = item.MedicineId,
                                BatchNumber   = batchNumber,
                                ExpiryDate    = item.ExpiryDate ?? now.AddYears(1),
                                CurrentStock  = item.Quantity,
                                PurchasePrice = item.UnitCost,
                                SalePrice     = item.SalePrice > 0 ? item.SalePrice : item.UnitCost,
                                Status        = "Active",
                                ReceivedAt    = now,
                                CreatedAt     = now,
                                CreatedBy     = username
                            };
                            _context.MedicineBatches.Add(batch);
                        }

                        // Update tenant-wide medicine catalog stock summary
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
                    dto.TenantId      = purchase.TenantId;
                    dto.BranchId      = purchase.BranchId;
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

        // ─── Delete (with stock & MedicineBatch reversal) ───────────────────
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
                        var batchNumber = string.IsNullOrWhiteSpace(item.BatchNumber) ? "DEFAULT" : item.BatchNumber.Trim();
                        var batch = await _context.MedicineBatches
                            .FirstOrDefaultAsync(b => b.TenantId == p.TenantId &&
                                                      b.BranchId == p.BranchId &&
                                                      b.MedicineId == item.MedicineId &&
                                                      b.BatchNumber == batchNumber);
                        if (batch != null)
                        {
                            batch.CurrentStock = Math.Max(0, batch.CurrentStock - item.Quantity);
                        }

                        var medicine = await _context.Medicines.FindAsync(item.MedicineId);
                        if (medicine != null)
                        {
                            medicine.StockQuantity = Math.Max(0, medicine.StockQuantity - item.Quantity);
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
