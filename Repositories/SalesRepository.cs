using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class SalesRepository : ISalesRepository
    {
        private readonly ApplicationDbContext _context;
        private static readonly string _tz = "Bangladesh Standard Time";

        public SalesRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        private DateTime BdNow() =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(_tz));

        // ─── Invoice Code: INV20260315-1 (resets daily) ─────────────────────
        public async Task<string> GetNextInvoiceCodeAsync()
        {
            var today = BdNow().Date;
            var prefix = $"INV{today:yyyyMMdd}-";

            var last = await _context.SalesMasters
                .Where(s => s.InvoiceCode.StartsWith(prefix))
                .OrderByDescending(s => s.SaleId)
                .Select(s => s.InvoiceCode)
                .FirstOrDefaultAsync();

            int next = 1;
            if (!string.IsNullOrEmpty(last))
            {
                var parts = last.Split('-');
                if (parts.Length == 2 && int.TryParse(parts[1], out int num))
                    next = num + 1;
            }
            return $"{prefix}{next}";
        }

        // ─── FEFO Batch List for a Medicine ─────────────────────────────────
        public async Task<IEnumerable<SaleBatchInfoDto>> GetBatchesForMedicineAsync(int medicineId)
        {
            var today = BdNow().Date;
            var nearExpiryThreshold = today.AddDays(90);

            var medicine = await _context.Medicines.AsNoTracking()
                .FirstOrDefaultAsync(m => m.MedicineId == medicineId);
            
            if (medicine == null) return Enumerable.Empty<SaleBatchInfoDto>();

            // 1. Collect all "Inputs" (Opening Stock + Purchases)
            var allBatches = new List<SaleBatchInfoDto>();

            // Add Opening Stock (from Medicine table)
            if (medicine.StockQuantity > 0 || !string.IsNullOrEmpty(medicine.Batch))
            {
                allBatches.Add(new SaleBatchInfoDto
                {
                    BatchNumber = string.IsNullOrEmpty(medicine.Batch) ? "OPENING" : medicine.Batch,
                    ExpiryDate = medicine.ExpiryDate,
                    AvailableQty = medicine.StockQuantity,
                    SalePrice = medicine.SalePrice,
                    IsNearExpiry = medicine.ExpiryDate.HasValue && medicine.ExpiryDate.Value.Date <= nearExpiryThreshold
                });
            }

            // Add Purchases (from PurchaseDetails table)
            // Note: Since Medicine.StockQuantity is the current total, we need to be careful.
            // Actually, the system updates Medicine.StockQuantity on every Purchase and Sale.
            // So Medicine.StockQuantity = (Sum of all Purchases + Opening) - (Sum of all Sales).
            // To find the *Current* stock per batch, we need tracked sales per batch.

            var purchases = await _context.PurchaseDetails
                .Where(pd => pd.MedicineId == medicineId)
                .Select(pd => new SaleBatchInfoDto
                {
                    BatchNumber = pd.BatchNumber,
                    ExpiryDate = pd.ExpiryDate,
                    AvailableQty = pd.Quantity,
                    SalePrice = pd.SalePrice,
                    IsNearExpiry = pd.ExpiryDate.HasValue && pd.ExpiryDate.Value.Date <= nearExpiryThreshold
                })
                .ToListAsync();

            allBatches.AddRange(purchases);

            // 2. Group by Batch + Expiry to avoid doubling the same batch from multiple purchases
            var groupedBatches = allBatches
                .GroupBy(b => new { 
                    Batch = (b.BatchNumber ?? "N/A").Trim().ToUpper(), 
                    Expiry = b.ExpiryDate?.Date 
                })
                .Select(g => new SaleBatchInfoDto
                {
                    BatchNumber = g.Key.Batch,
                    ExpiryDate = g.Key.Expiry,
                    AvailableQty = g.Sum(x => x.AvailableQty),
                    SalePrice = g.Max(x => x.SalePrice),
                    IsNearExpiry = g.Any(x => x.IsNearExpiry)
                })
                .OrderBy(b => b.ExpiryDate ?? DateTime.MaxValue)
                .ToList();

            // 3. Subtract ALL Sales (FEFO) - This is the most accurate way since sales aren't always 
            // strictly tied to the batch they were sold from in legacy logic, or to handle the opening stock.
            var totalSales = await _context.SalesDetails
                .Where(sd => sd.MedicineId == medicineId && sd.SalesMaster!.SaleStatus == "Completed")
                .SumAsync(sd => sd.Quantity);

            int remainingToSubtract = totalSales;
            var result = new List<SaleBatchInfoDto>();

            foreach (var b in groupedBatches)
            {
                int subtractFromThisBatch = Math.Min(b.AvailableQty, remainingToSubtract);
                b.AvailableQty -= subtractFromThisBatch;
                remainingToSubtract -= subtractFromThisBatch;

                if (b.AvailableQty > 0)
                {
                    result.Add(b);
                }
            }

            return result;
        }

        // ─── Paged Sale List ─────────────────────────────────────────────────
        public async Task<PagedResult<SalesMasterDto>> GetPagedAsync(SaleSearchParameters parameters)
        {
            var query = _context.SalesMasters
                .Include(s => s.Party)
                .AsQueryable();

            if (!string.IsNullOrEmpty(parameters.SearchText))
            {
                var s = parameters.SearchText.ToLower();
                if (s == "due" || s == "বকেয়া")
                {
                    query = query.Where(x => x.DueAmount > 0);
                }
                else
                {
                    query = query.Where(x =>
                        x.InvoiceCode.ToLower().Contains(s) ||
                        x.CustomerName.ToLower().Contains(s) ||
                        (x.CustomerPhone != null && x.CustomerPhone.Contains(s)));
                }
            }

            if (parameters.FromDate.HasValue)
                query = query.Where(x => x.SaleDate >= parameters.FromDate.Value.Date);

            if (parameters.ToDate.HasValue)
                query = query.Where(x => x.SaleDate <= parameters.ToDate.Value.Date);

            if (!string.IsNullOrEmpty(parameters.SaleStatus))
            {
                if (parameters.SaleStatus == "Due")
                {
                    query = query.Where(x => x.DueAmount > 0);
                }
                else
                {
                    query = query.Where(x => x.SaleStatus == parameters.SaleStatus);
                }
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.SaleTime)
                .Skip((parameters.PageNumber - 1) * parameters.PageSize)
                .Take(parameters.PageSize)
                .Select(x => new SalesMasterDto
                {
                    SaleId = x.SaleId,
                    InvoiceCode = x.InvoiceCode,
                    PartyId = x.PartyId,
                    CustomerName = x.CustomerName,
                    CustomerPhone = x.CustomerPhone,
                    CustomerIsRegistered = x.Party != null, // In Party table, all are registered
                    SaleDate = x.SaleDate,
                    SaleTime = x.SaleTime,
                    SubTotal = x.SubTotal,
                    TotalDiscount = x.TotalDiscount,
                    TotalTax = x.TotalTax,
                    SpecialDiscount = x.SpecialDiscount,
                    GrandTotal = x.GrandTotal,
                    PaidAmount = x.PaidAmount,
                    ChangeAmount = x.ChangeAmount,
                    DueAmount = x.DueAmount,
                    PaymentMethod = x.PaymentMethod,
                    PaymentStatus = x.PaymentStatus,
                    SaleStatus = x.SaleStatus,
                    CreatedBy = _context.Users.Where(u => u.UserName == x.CreatedBy).Select(u => u.FullName).FirstOrDefault() ?? x.CreatedBy
                }).ToListAsync();

            return new PagedResult<SalesMasterDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = parameters.PageNumber,
                PageSize = parameters.PageSize
            };
        }

        // ─── Get By ID ───────────────────────────────────────────────────────
        public async Task<SalesMasterDto?> GetByIdAsync(int id)
        {
            var s = await _context.SalesMasters
                .Include(x => x.Party)
                .Include(x => x.SalesDetails).ThenInclude(d => d.Medicine)
                .Include(x => x.SalesDetails).ThenInclude(d => d.Uom)
                .Include(x => x.SalesPayments)
                .FirstOrDefaultAsync(x => x.SaleId == id);

            if (s == null) return null;

            return new SalesMasterDto
            {
                SaleId = s.SaleId,
                InvoiceCode = s.InvoiceCode,
                PartyId = s.PartyId,
                CustomerName = s.CustomerName,
                CustomerPhone = s.CustomerPhone,
                CustomerIsRegistered = s.Party != null,
                SaleDate = s.SaleDate,
                SaleTime = s.SaleTime,
                SubTotal = s.SubTotal,
                TotalDiscount = s.TotalDiscount,
                TotalTax = s.TotalTax,
                SpecialDiscount = s.SpecialDiscount,
                GrandTotal = s.GrandTotal,
                PaidAmount = s.PaidAmount,
                ChangeAmount = s.ChangeAmount,
                DueAmount = s.DueAmount,
                PaymentMethod = s.PaymentMethod,
                PaymentStatus = s.PaymentStatus,
                SaleStatus = s.SaleStatus,
                CreatedBy = _context.Users.Where(u => u.UserName == s.CreatedBy).Select(u => u.FullName).FirstOrDefault() ?? s.CreatedBy,
                SalesDetails = s.SalesDetails.Select(d => new SalesDetailDto
                {
                    SalesDetailId = d.SalesDetailId,
                    MedicineId = d.MedicineId,
                    MedicineName = d.Medicine?.Name,
                    BatchNumber = d.BatchNumber,
                    ExpiryDate = d.ExpiryDate,
                    Quantity = d.Quantity,
                    UomId = d.UomId,
                    UomName = d.UomName,
                    UnitPrice = d.UnitPrice,
                    DiscountPercent = d.DiscountPercent,
                    DiscountAmount = d.DiscountAmount,
                    TaxPercent = d.TaxPercent,
                    TaxAmount = d.TaxAmount,
                    LineTotal = d.LineTotal,
                    Tax = d.Tax,
                    Subtotal = d.Subtotal
                }).ToList(),
                SalesPayments = s.SalesPayments.Select(p => new SalesPaymentDto
                {
                    SalesPaymentId = p.SalesPaymentId,
                    SaleId = p.SaleId,
                    PaymentMethod = p.PaymentMethod,
                    Amount = p.Amount,
                    AccountNumber = p.AccountNumber,
                    TransactionId = p.TransactionId,
                    Remarks = p.Remarks,
                    CreatedAt = p.CreatedAt
                }).ToList()
            };
        }

        // ─── Create (Transaction + Stock Deduction) ──────────────────────────
        public async Task<SalesMasterDto> CreateAsync(SalesMasterDto dto, string username)
        {
            return await SaveSaleAsync(dto, username, "Completed");
        }

        // ─── Hold (No Stock Deduction) ───────────────────────────────────────
        public async Task<SalesMasterDto> HoldAsync(SalesMasterDto dto, string username)
        {
            return await SaveSaleAsync(dto, username, "Hold");
        }

        private async Task<SalesMasterDto> SaveSaleAsync(SalesMasterDto dto, string username, string status)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var now = BdNow();
                    var invoiceCode = await GetNextInvoiceCodeAsync();

                    // Due validation: only registered customers can have due
                    if (dto.DueAmount > 0 && !dto.CustomerIsRegistered)
                        throw new InvalidOperationException("Walking Guest / Unregistered customers cannot have a due balance.");

                    var sale = new SalesMaster
                    {
                        InvoiceCode = invoiceCode,
                        PartyId = dto.PartyId,
                        CustomerName = dto.CustomerName,
                        CustomerPhone = dto.CustomerPhone,
                        SaleDate = dto.SaleDate.Date,
                        SaleTime = now,
                        SubTotal = dto.SubTotal,
                        TotalDiscount = dto.TotalDiscount,
                        TotalTax = dto.TotalTax,
                        SpecialDiscount = dto.SpecialDiscount,
                        GrandTotal = dto.GrandTotal,
                        PaidAmount = dto.PaidAmount,
                        ChangeAmount = dto.ChangeAmount,
                        DueAmount = dto.DueAmount,
                        PaymentMethod = dto.PaymentMethod,
                        SaleStatus = status,
                        CreatedBy = username,
                        CreatedAt = now
                    };

                    // Payment status
                    sale.PaymentStatus = sale.DueAmount <= 0 ? "Paid"
                        : sale.PaidAmount > 0 ? "Partial" : "Due";

                    // Details + Stock deduction (only for Completed sales)
                    foreach (var item in dto.SalesDetails)
                    {
                        var detail = new SalesDetail
                        {
                            MedicineId = item.MedicineId,
                            BatchNumber = item.BatchNumber,
                            ExpiryDate = item.ExpiryDate,
                            Quantity = item.Quantity,
                            UomId = item.UomId,
                            UomName = item.UomName,
                            UnitPrice = item.UnitPrice,
                            DiscountPercent = item.DiscountPercent,
                            DiscountAmount = item.DiscountAmount,
                            TaxPercent = item.TaxPercent,
                            TaxAmount = item.TaxAmount,
                            LineTotal = item.LineTotal,
                            Tax = item.TaxAmount,
                            Subtotal = item.LineTotal,
                            CreatedAt = now
                        };
                        sale.SalesDetails.Add(detail);

                        if (status == "Completed")
                        {
                            var med = await _context.Medicines.FindAsync(item.MedicineId);
                            if (med == null || med.StockQuantity < item.Quantity)
                                throw new InvalidOperationException(
                                    $"Insufficient stock for '{med?.Name ?? "Medicine ID " + item.MedicineId}'. Available: {med?.StockQuantity ?? 0}.");
                            med.StockQuantity -= item.Quantity;
                            _context.Entry(med).State = EntityState.Modified;
                        }
                    }

                    // Payments
                    foreach (var pm in dto.SalesPayments.Where(p => p.Amount > 0))
                    {
                        sale.SalesPayments.Add(new SalesPayment
                        {
                            PaymentMethod = pm.PaymentMethod,
                            Amount = pm.Amount,
                            AccountNumber = pm.AccountNumber,
                            TransactionId = pm.TransactionId,
                            Remarks = pm.Remarks
                        });
                    }

                    _context.SalesMasters.Add(sale);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    dto.SaleId = sale.SaleId;
                    dto.InvoiceCode = invoiceCode;
                    dto.SaleTime = sale.SaleTime;
                    dto.PaymentStatus = sale.PaymentStatus;
                    dto.SaleStatus = sale.SaleStatus;
                    return dto;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // ─── Delete (with stock reversal for Completed only) ─────────────────
        public async Task<bool> DeleteAsync(int id)
        {
            var sale = await _context.SalesMasters
                .Include(s => s.SalesDetails)
                .Include(s => s.SalesPayments)
                .FirstOrDefaultAsync(s => s.SaleId == id);

            if (sale == null) return false;

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Protection: Do not allow deleting a sale that has payments (except the initial one if it was part of creation,
                    // but usually, any payment means transaction started). 
                    // Best practice: If Due Collection has been used, the sale is "locked" from direct deletion.
                    if (sale.SalesPayments.Any())
                    {
                        // Optional: You could allow it if PaidAmount is 0, but usually SalesPayments table being populated means money changed hands.
                        // I will return false to signal "cannot delete due to existing payments".
                        return false; 
                    }

                    if (sale.SaleStatus == "Completed")

                    {
                        foreach (var item in sale.SalesDetails)
                        {
                            var med = await _context.Medicines.FindAsync(item.MedicineId);
                            if (med != null)
                            {
                                med.StockQuantity += item.Quantity;
                                _context.Entry(med).State = EntityState.Modified;
                            }
                        }
                    }

                    _context.SalesMasters.Remove(sale);
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
