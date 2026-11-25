using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;
using PharmacyApi.Services;

namespace PharmacyApi.Repositories
{
    public class SalesRepository : ISalesRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly ITenantContextService _ctx;
        private static readonly string _tz = "Bangladesh Standard Time";

        public SalesRepository(ApplicationDbContext context, ITenantContextService ctx)
        {
            _context = context;
            _ctx = ctx;
        }

        private DateTime BdNow() =>
            TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(_tz));

        // ─── Invoice Code: INV20260315-1 (resets daily, tenant-wide across branches) ───
        public Task<string> GetNextInvoiceCodeAsync(int? tenantId = null)
        {
            int resolvedTenantId = SequenceCodeHelper.ResolveTenantId(_ctx, tenantId);
            return GetNextInvoiceCodeForTenantAsync(resolvedTenantId, BdNow().Date);
        }

        private async Task<string> GetNextInvoiceCodeForTenantAsync(
            int tenantId,
            DateTime today,
            CancellationToken cancellationToken = default)
        {
            var prefix = $"INV{today:yyyyMMdd}-";

            // ARCHITECTURAL INTENT: SalesMaster uses a Tier-2 Global Query Filter (TenantId + BranchId),
            // whereas IX_SalesMasters_TenantId_InvoiceCode enforces uniqueness Tenant-wide across all branches.
            // IgnoreQueryFilters() bypasses the Branch filter while scoping strictly to resolved tenantId.
            var recentCodes = await _context.SalesMasters
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(s => s.TenantId == tenantId && s.InvoiceCode.StartsWith(prefix))
                .OrderByDescending(s => s.InvoiceCode.Length)
                .ThenByDescending(s => s.InvoiceCode)
                .Select(s => s.InvoiceCode)
                .Take(50)
                .ToListAsync(cancellationToken);

            int next = SequenceCodeHelper.ComputeNextSequenceNumber(recentCodes, prefix);
            return $"{prefix}{next}";
        }

        // ─── FEFO Batch List for a Medicine (Branch-aware via MedicineBatches) ───
        public async Task<IEnumerable<SaleBatchInfoDto>> GetBatchesForMedicineAsync(int medicineId)
        {
            var today = BdNow().Date;
            var nearExpiryThreshold = today.AddDays(90);

            // Directly query branch-isolated MedicineBatches
            var batches = await _context.MedicineBatches
                .AsNoTracking()
                .Where(b => b.MedicineId == medicineId && b.CurrentStock > 0)
                .OrderBy(b => b.ExpiryDate)
                .Select(b => new SaleBatchInfoDto
                {
                    BatchNumber  = b.BatchNumber,
                    ExpiryDate   = b.ExpiryDate,
                    AvailableQty = b.CurrentStock,
                    SalePrice    = b.SalePrice,
                    IsNearExpiry = b.ExpiryDate <= nearExpiryThreshold
                })
                .ToListAsync();

            // Fallback for legacy medicines without MedicineBatch entry
            if (!batches.Any())
            {
                var med = await _context.Medicines.AsNoTracking()
                    .FirstOrDefaultAsync(m => m.MedicineId == medicineId);
                if (med != null && med.StockQuantity > 0)
                {
                    batches.Add(new SaleBatchInfoDto
                    {
                        BatchNumber  = string.IsNullOrEmpty(med.Batch) ? "DEFAULT" : med.Batch,
                        ExpiryDate   = med.ExpiryDate,
                        AvailableQty = med.StockQuantity,
                        SalePrice    = med.SalePrice,
                        IsNearExpiry = med.ExpiryDate.HasValue && med.ExpiryDate.Value.Date <= nearExpiryThreshold
                    });
                }
            }

            return batches;
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
                    SaleId               = x.SaleId,
                    InvoiceCode          = x.InvoiceCode,
                    TenantId             = x.TenantId,
                    BranchId             = x.BranchId,
                    PartyId              = x.PartyId,
                    CustomerName         = x.CustomerName,
                    CustomerPhone        = x.CustomerPhone,
                    CustomerIsRegistered = x.Party != null,
                    SaleDate             = x.SaleDate,
                    SaleTime             = x.SaleTime,
                    SubTotal             = x.SubTotal,
                    TotalDiscount        = x.TotalDiscount,
                    TotalTax             = x.TotalTax,
                    SpecialDiscount      = x.SpecialDiscount,
                    GrandTotal           = x.GrandTotal,
                    PaidAmount           = x.PaidAmount,
                    ChangeAmount         = x.ChangeAmount,
                    DueAmount            = x.DueAmount,
                    PaymentMethod        = x.PaymentMethod,
                    PaymentStatus        = x.PaymentStatus,
                    SaleStatus           = x.SaleStatus,
                    CreatedBy            = _context.Users.Where(u => u.UserName == x.CreatedBy).Select(u => u.FullName).FirstOrDefault() ?? x.CreatedBy
                }).ToListAsync();

            return new PagedResult<SalesMasterDto>
            {
                Items      = items,
                TotalCount = totalCount,
                PageNumber = parameters.PageNumber,
                PageSize   = parameters.PageSize
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
                SaleId               = s.SaleId,
                InvoiceCode          = s.InvoiceCode,
                TenantId             = s.TenantId,
                BranchId             = s.BranchId,
                PartyId              = s.PartyId,
                CustomerName         = s.CustomerName,
                CustomerPhone        = s.CustomerPhone,
                CustomerIsRegistered = s.Party != null,
                SaleDate             = s.SaleDate,
                SaleTime             = s.SaleTime,
                SubTotal             = s.SubTotal,
                TotalDiscount        = s.TotalDiscount,
                TotalTax             = s.TotalTax,
                SpecialDiscount      = s.SpecialDiscount,
                GrandTotal           = s.GrandTotal,
                PaidAmount           = s.PaidAmount,
                ChangeAmount         = s.ChangeAmount,
                DueAmount            = s.DueAmount,
                PaymentMethod        = s.PaymentMethod,
                PaymentStatus        = s.PaymentStatus,
                SaleStatus           = s.SaleStatus,
                CreatedBy            = _context.Users.Where(u => u.UserName == s.CreatedBy).Select(u => u.FullName).FirstOrDefault() ?? s.CreatedBy,
                SalesDetails = s.SalesDetails.Select(d => new SalesDetailDto
                {
                    SalesDetailId   = d.SalesDetailId,
                    MedicineId      = d.MedicineId,
                    MedicineName    = d.Medicine?.Name,
                    BatchNumber     = d.BatchNumber,
                    ExpiryDate      = d.ExpiryDate,
                    Quantity        = d.Quantity,
                    UomId           = d.UomId,
                    UomName         = d.UomName,
                    UnitPrice       = d.UnitPrice,
                    DiscountPercent = d.DiscountPercent,
                    DiscountAmount  = d.DiscountAmount,
                    TaxPercent      = d.TaxPercent,
                    TaxAmount       = d.TaxAmount,
                    LineTotal       = d.LineTotal,
                    Tax             = d.Tax,
                    Subtotal        = d.Subtotal
                }).ToList(),
                SalesPayments = s.SalesPayments.Select(p => new SalesPaymentDto
                {
                    SalesPaymentId = p.SalesPaymentId,
                    SaleId         = p.SaleId,
                    PaymentMethod  = p.PaymentMethod,
                    Amount         = p.Amount,
                    AccountNumber  = p.AccountNumber,
                    TransactionId  = p.TransactionId,
                    Remarks        = p.Remarks,
                    CreatedAt      = p.CreatedAt
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
            // Due validation: only registered customers can have due
            if (dto.DueAmount > 0 && !dto.CustomerIsRegistered)
                throw new InvalidOperationException("Walking Guest / অনিবন্ধিত গ্রাহকের ক্ষেত্রে বকেয়া গ্রহণযোগ্য নয়।");

            return await _context.ExecuteInTransactionAsync(async ct =>
            {
                var now = BdNow();

                // Resolve TenantId & BranchId BEFORE acquiring sequence lock & generating InvoiceCode
                int tenantId = SequenceCodeHelper.ResolveTenantId(_ctx, dto.TenantId);
                int branchId = await SequenceCodeHelper.ResolveBranchIdAsync(_context, _ctx, tenantId, dto.BranchId, ct);

                await _context.AcquireTransactionAppLockAsync($"SEQ_INV_T{tenantId}", ct);
                var invoiceCode = await GetNextInvoiceCodeForTenantAsync(tenantId, now.Date, ct);

                var sale = new SalesMaster
                    {
                        InvoiceCode     = invoiceCode,
                        TenantId        = tenantId,
                        BranchId        = branchId,
                        PartyId         = dto.PartyId,
                        CustomerName    = dto.CustomerName,
                        CustomerPhone   = dto.CustomerPhone,
                        SaleDate        = dto.SaleDate.Date,
                        SaleTime        = now,
                        SubTotal        = dto.SubTotal,
                        TotalDiscount   = dto.TotalDiscount,
                        TotalTax        = dto.TotalTax,
                        SpecialDiscount = dto.SpecialDiscount,
                        GrandTotal      = dto.GrandTotal,
                        PaidAmount      = dto.PaidAmount,
                        ChangeAmount    = dto.ChangeAmount,
                        DueAmount       = dto.DueAmount,
                        PaymentMethod   = dto.PaymentMethod,
                        SaleStatus      = status,
                        CreatedBy       = username,
                        CreatedAt       = now
                    };

                    // Payment status
                    sale.PaymentStatus = sale.DueAmount <= 0 ? "Paid"
                        : sale.PaidAmount > 0 ? "Partial" : "Due";

                    // Details + Batch Stock Deduction (only for Completed sales)
                    foreach (var item in dto.SalesDetails)
                    {
                        var med = await _context.Medicines.FindAsync(item.MedicineId);
                        if (med == null)
                            throw new InvalidOperationException($"ওষুধ আইডি {item.MedicineId} ডাটাবেসে পাওয়া যায়নি।");

                        if (status == "Completed")
                        {
                            // ─── POS Expiry & Recall Guard + FIFO Batch Deduction ───
                            if (!string.IsNullOrWhiteSpace(item.BatchNumber))
                            {
                                var cleanBatch = item.BatchNumber.Trim();
                                var targetBatch = await _context.MedicineBatches
                                    .FirstOrDefaultAsync(b => b.TenantId == tenantId &&
                                                              b.BranchId == branchId &&
                                                              b.MedicineId == item.MedicineId &&
                                                              b.BatchNumber == cleanBatch);

                                if (targetBatch != null)
                                {
                                    if (targetBatch.Status == "Recalled")
                                        throw new InvalidOperationException($"ওষুধ '{med.Name}' (ব্যাচ: {targetBatch.BatchNumber}) রিকল করা হয়েছে। এটি বিক্রি সম্পূর্ণ নিষিদ্ধ।");
                                    if (targetBatch.Status == "Quarantined")
                                        throw new InvalidOperationException($"ওষুধ '{med.Name}' (ব্যাচ: {targetBatch.BatchNumber}) কোয়ারেন্টাইন করা হয়েছে। এটি বিক্রি করা যাবে না।");
                                    if (targetBatch.ExpiryDate.Date < now.Date)
                                        throw new InvalidOperationException($"ওষুধ '{med.Name}' (ব্যাচ: {targetBatch.BatchNumber}) এর মেয়াদ {targetBatch.ExpiryDate:dd/MM/yyyy} তারিখে শেষ হয়ে গেছে। মেয়াদোত্তীর্ণ ওষুধ বিক্রি সম্পূর্ণ নিষিদ্ধ।");
                                    if (targetBatch.CurrentStock < item.Quantity)
                                        throw new InvalidOperationException($"ব্যাচ '{targetBatch.BatchNumber}'-এ অপর্যাপ্ত স্টক। উপলব্ধ: {targetBatch.CurrentStock}, চাওয়া হয়েছে: {item.Quantity}।");

                                    targetBatch.CurrentStock -= item.Quantity;
                                    item.ExpiryDate = targetBatch.ExpiryDate;
                                }
                                else
                                {
                                    // If batch was manually entered but not yet in MedicineBatches, check Medicine catalog stock
                                    if (med.StockQuantity < item.Quantity)
                                        throw new InvalidOperationException($"'{med.Name}' এর অপর্যাপ্ত স্টক। উপলব্ধ: {med.StockQuantity}, চাওয়া হয়েছে: {item.Quantity}।");
                                }
                            }
                            else
                            {
                                // Automatic FIFO deduction across active, non-expired batches
                                var activeBatches = await _context.MedicineBatches
                                    .Where(b => b.TenantId == tenantId &&
                                                b.BranchId == branchId &&
                                                b.MedicineId == item.MedicineId &&
                                                b.CurrentStock > 0 &&
                                                b.Status == "Active" &&
                                                b.ExpiryDate >= now.Date)
                                    .OrderBy(b => b.ExpiryDate)
                                    .ThenBy(b => b.ReceivedAt)
                                    .ToListAsync();

                                int totalBatchStock = activeBatches.Sum(b => b.CurrentStock);
                                if (totalBatchStock < item.Quantity && med.StockQuantity < item.Quantity)
                                {
                                    throw new InvalidOperationException(
                                        $"'{med.Name}' এর জন্য সক্রিয় ও মেয়াদযুক্ত স্টক আছে মাত্র {totalBatchStock} টি। চাওয়া হয়েছে: {item.Quantity} টি।");
                                }

                                int remaining = item.Quantity;
                                foreach (var b in activeBatches)
                                {
                                    int take = Math.Min(b.CurrentStock, remaining);
                                    b.CurrentStock -= take;
                                    remaining -= take;

                                    if (string.IsNullOrEmpty(item.BatchNumber))
                                    {
                                        item.BatchNumber = b.BatchNumber;
                                        item.ExpiryDate  = b.ExpiryDate;
                                    }

                                    if (remaining <= 0) break;
                                }
                            }

                            // Update tenant-wide medicine catalog stock
                            med.StockQuantity = Math.Max(0, med.StockQuantity - item.Quantity);
                            _context.Entry(med).State = EntityState.Modified;
                        }

                        var detail = new SalesDetail
                        {
                            MedicineId      = item.MedicineId,
                            BatchNumber     = item.BatchNumber ?? string.Empty,
                            ExpiryDate      = item.ExpiryDate,
                            Quantity        = item.Quantity,
                            UomId           = item.UomId,
                            UomName         = item.UomName,
                            UnitPrice       = item.UnitPrice,
                            DiscountPercent = item.DiscountPercent,
                            DiscountAmount  = item.DiscountAmount,
                            TaxPercent      = item.TaxPercent,
                            TaxAmount       = item.TaxAmount,
                            LineTotal       = item.LineTotal,
                            Tax             = item.TaxAmount,
                            Subtotal        = item.LineTotal,
                            CreatedAt       = now
                        };
                        sale.SalesDetails.Add(detail);
                    }

                    // Payments
                    foreach (var pm in dto.SalesPayments.Where(p => p.Amount > 0))
                    {
                        sale.SalesPayments.Add(new SalesPayment
                        {
                            PaymentMethod = pm.PaymentMethod,
                            Amount        = pm.Amount,
                            AccountNumber = pm.AccountNumber,
                            TransactionId = pm.TransactionId,
                            Remarks       = pm.Remarks
                        });
                    }

                    _context.SalesMasters.Add(sale);
                    await _context.SaveChangesAsync(ct);

                    dto.SaleId        = sale.SaleId;
                    dto.InvoiceCode   = invoiceCode;
                    dto.TenantId      = sale.TenantId;
                    dto.BranchId      = sale.BranchId;
                    dto.SaleTime      = sale.SaleTime;
                    dto.PaymentStatus = sale.PaymentStatus;
                    dto.SaleStatus    = sale.SaleStatus;
                    return (true, dto);
            });
        }

        // ─── Delete (with stock & MedicineBatch reversal for Completed only) ──
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
                    // Protection: Do not allow deleting a sale that has payments recorded in SalesPayments
                    if (sale.SalesPayments.Any())
                    {
                        return false; 
                    }

                    if (sale.SaleStatus == "Completed")
                    {
                        foreach (var item in sale.SalesDetails)
                        {
                            if (!string.IsNullOrWhiteSpace(item.BatchNumber))
                            {
                                var cleanBatch = item.BatchNumber.Trim();
                                var batch = await _context.MedicineBatches
                                    .FirstOrDefaultAsync(b => b.TenantId == sale.TenantId &&
                                                              b.BranchId == sale.BranchId &&
                                                              b.MedicineId == item.MedicineId &&
                                                              b.BatchNumber == cleanBatch);
                                if (batch != null)
                                {
                                    batch.CurrentStock += item.Quantity;
                                }
                            }

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
