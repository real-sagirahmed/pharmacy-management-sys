using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class MedicineRepository : IMedicineRepository
    {
        private readonly ApplicationDbContext _context;

        public MedicineRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        private DateTime GetBdNow()
        {
            try
            {
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time"));
            }
            catch
            {
                return DateTime.UtcNow.AddHours(6); // Fallback
            }
        }

        public async Task<PagedResult<MedicineDto>> GetPagedAsync(MedicineSearchParameters parms)
        {
            var query = _context.Medicines.AsQueryable();

            // Filters
            if (!string.IsNullOrWhiteSpace(parms.SearchText))
            {
                var search = parms.SearchText.ToLower();
                query = query.Where(m => m.Name.ToLower().Contains(search) || 
                                       m.GenericName.ToLower().Contains(search) || 
                                       m.Code.ToLower().Contains(search));
            }

            if (!string.IsNullOrWhiteSpace(parms.Category))
                query = query.Where(m => m.Category == parms.Category);

            if (!string.IsNullOrWhiteSpace(parms.GenericName))
                query = query.Where(m => m.GenericName == parms.GenericName);

            if (parms.ExpiryFrom.HasValue)
                query = query.Where(m => m.ExpiryDate >= parms.ExpiryFrom.Value);

            if (parms.ExpiryTo.HasValue)
                query = query.Where(m => m.ExpiryDate <= parms.ExpiryTo.Value);

            if (!string.IsNullOrWhiteSpace(parms.Manufacturer))
                query = query.Where(m => m.Manufacturer == parms.Manufacturer);

            if (!string.IsNullOrWhiteSpace(parms.DosageForm))
                query = query.Where(m => m.DosageForm == parms.DosageForm);

            if (!string.IsNullOrWhiteSpace(parms.Strength))
                query = query.Where(m => m.Strength == parms.Strength);

            if (!string.IsNullOrWhiteSpace(parms.UseFor))
                query = query.Where(m => m.UseFor == parms.UseFor);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(m => m.Name)
                .Skip((parms.PageNumber - 1) * parms.PageSize)
                .Take(parms.PageSize)
                .Select(m => new MedicineDto
                {
                    MedicineId = m.MedicineId,
                    Code = m.Code,
                    Name = m.Name,
                    GenericName = m.GenericName,
                    Category = m.Category,
                    UOM = m.UOM,
                    PurchasePrice = m.PurchasePrice,
                    SalePrice = m.SalePrice,
                    StockQuantity = m.StockQuantity,
                    Batch = m.Batch,
                    ExpiryDate = m.ExpiryDate,
                    Manufacturer = m.Manufacturer,
                    DosageForm = m.DosageForm,
                    Strength = m.Strength,
                    UseFor = m.UseFor,
                    IsActive = m.IsActive,
                    CreatedAt = m.CreatedAt,
                    CreatedBy = m.CreatedBy,
                    UpdatedAt = m.UpdatedAt,
                    UpdatedBy = m.UpdatedBy
                }).ToListAsync();

            return new PagedResult<MedicineDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = parms.PageNumber,
                PageSize = parms.PageSize
            };
        }

        public async Task<MedicineDto?> GetByIdAsync(int id)
        {
            var m = await _context.Medicines.FindAsync(id);
            if (m == null) return null;

            var dto = new MedicineDto
            {
                MedicineId = m.MedicineId,
                Code = m.Code,
                Name = m.Name,
                GenericName = m.GenericName,
                Category = m.Category,
                UOM = m.UOM,
                PurchasePrice = m.PurchasePrice,
                SalePrice = m.SalePrice,
                StockQuantity = m.StockQuantity,
                Batch = m.Batch,
                ExpiryDate = m.ExpiryDate,
                Manufacturer = m.Manufacturer,
                DosageForm = m.DosageForm,
                Strength = m.Strength,
                UseFor = m.UseFor,
                IsActive = m.IsActive,
                CreatedAt = m.CreatedAt,
                CreatedBy = m.CreatedBy,
                UpdatedAt = m.UpdatedAt,
                UpdatedBy = m.UpdatedBy
            };

            // 1. Collect all "Inputs" (Opening Stock + Purchases)
            var allBatches = new List<MedicineBatchDto>();

            // Add Opening Stock (initial balance from Medicine table)
            if (m.StockQuantity > 0 || !string.IsNullOrEmpty(m.Batch))
            {
                allBatches.Add(new MedicineBatchDto
                {
                    BatchNumber = string.IsNullOrEmpty(m.Batch) ? "OPENING" : m.Batch,
                    ExpiryDate = m.ExpiryDate,
                    RemainingQuantity = m.StockQuantity,
                    PurchasePrice = m.PurchasePrice
                });
            }

            // Add Purchases (from PurchaseDetails table)
            var purchases = await _context.PurchaseDetails
                .Where(pd => pd.MedicineId == id)
                .Select(pd => new MedicineBatchDto { 
                    BatchNumber = pd.BatchNumber, 
                    ExpiryDate = pd.ExpiryDate, 
                    RemainingQuantity = pd.Quantity, 
                    PurchasePrice = pd.UnitCost 
                })
                .ToListAsync();
            
            allBatches.AddRange(purchases);

            // 2. Group by Batch + Expiry to get total infusion per batch
            var groupedBatches = allBatches
                .GroupBy(b => new { 
                    Batch = (b.BatchNumber ?? "N/A").Trim().ToUpper(), 
                    Expiry = b.ExpiryDate?.Date 
                })
                .Select(g => new MedicineBatchDto
                {
                    BatchNumber = g.Key.Batch,
                    ExpiryDate = g.Key.Expiry,
                    RemainingQuantity = g.Sum(x => x.RemainingQuantity),
                    PurchasePrice = g.Max(x => x.PurchasePrice)
                })
                .OrderBy(b => b.ExpiryDate ?? DateTime.MaxValue)
                .ToList();

            // 3. Subtract ALL Sales (FEFO) to find current remaining stock per batch
            var totalSales = await _context.SalesDetails
                .Where(sd => sd.MedicineId == id && sd.SalesMaster!.SaleStatus == "Completed")
                .SumAsync(sd => sd.Quantity);

            int remainingToSubtract = totalSales;
            foreach (var b in groupedBatches)
            {
                int subtractFromThisBatch = Math.Min(b.RemainingQuantity, remainingToSubtract);
                b.RemainingQuantity -= subtractFromThisBatch;
                remainingToSubtract -= subtractFromThisBatch;

                if (b.RemainingQuantity > 0 || totalSales == 0) // Keep batches with stock or all if no sales
                {
                    dto.Batches.Add(b);
                }
            }

            // If we have remainingToSubtract > 0, it means over-sold (inventory mismatch)
            // But we'll just show what's left.

            return dto;
        }

        public async Task<MedicineDto> CreateAsync(MedicineDto dto, string username)
        {
            if (await ExistsByNameAsync(dto.Name))
                throw new InvalidOperationException($"Medicine with name '{dto.Name}' already exists.");

            if (string.IsNullOrEmpty(dto.Code))
                dto.Code = await GetNextCodeAsync();

            var entity = new Medicine
            {
                Code = dto.Code,
                Name = dto.Name,
                GenericName = dto.GenericName,
                Category = dto.Category,
                UOM = dto.UOM,
                PurchasePrice = dto.PurchasePrice,
                SalePrice = dto.SalePrice,
                StockQuantity = dto.StockQuantity,
                Batch = dto.Batch,
                ExpiryDate = dto.ExpiryDate,
                Manufacturer = dto.Manufacturer,
                DosageForm = dto.DosageForm,
                Strength = dto.Strength,
                UseFor = dto.UseFor,
                IsActive = true,
                CreatedAt = GetBdNow(),
                CreatedBy = username
            };

            _context.Medicines.Add(entity);
            await _context.SaveChangesAsync();
            
            dto.MedicineId = entity.MedicineId;
            dto.CreatedAt = entity.CreatedAt;
            dto.CreatedBy = entity.CreatedBy;
            return dto;
        }

        public async Task<bool> UpdateAsync(int id, MedicineDto dto, string username)
        {
            var entity = await _context.Medicines.FindAsync(id);
            if (entity == null) return false;

            if (await ExistsByNameAsync(dto.Name, id))
                throw new InvalidOperationException($"Another Medicine with name '{dto.Name}' already exists.");

            entity.Name = dto.Name;
            entity.GenericName = dto.GenericName;
            entity.Category = dto.Category;
            entity.UOM = dto.UOM;
            entity.PurchasePrice = dto.PurchasePrice;
            entity.SalePrice = dto.SalePrice;
            entity.StockQuantity = dto.StockQuantity;
            entity.Batch = dto.Batch;
            entity.ExpiryDate = dto.ExpiryDate;
            entity.Manufacturer = dto.Manufacturer;
            entity.DosageForm = dto.DosageForm;
            entity.Strength = dto.Strength;
            entity.UseFor = dto.UseFor;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = GetBdNow();
            entity.UpdatedBy = username;

            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.Medicines.FindAsync(id);
            if (entity == null) return false;

            _context.Medicines.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<string> GetNextCodeAsync()
        {
            var prefix = "MEDI-";
            var lastCode = await _context.Medicines
                .Where(m => m.Code.StartsWith(prefix))
                .OrderByDescending(m => m.Code)
                .Select(m => m.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";

            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number))
            {
                return $"{prefix}{(number + 1).ToString("D4")}";
            }

            return $"{prefix}0001";
        }

        public async Task<bool> BatchExistsAsync(int medicineId, string batchNumber)
        {
            if (string.IsNullOrWhiteSpace(batchNumber)) return false;
            
            var b = batchNumber.Trim().ToLower();
            
            // Check in Medicine table (Opening Stock)
            var existsInMedicine = await _context.Medicines.AnyAsync(m => m.MedicineId == medicineId && m.Batch != null && m.Batch.ToLower() == b);
            if (existsInMedicine) return true;
            
            // Check in PurchaseDetails table
            var existsInPurchases = await _context.PurchaseDetails.AnyAsync(pd => pd.MedicineId == medicineId && pd.BatchNumber != null && pd.BatchNumber.ToLower() == b);
            return existsInPurchases;
        }

        public async Task<bool> ExistsByNameAsync(string name, int? excludeId = null)
        {
            if (excludeId.HasValue)
                return await _context.Medicines.AnyAsync(m => m.Name != null && m.Name.ToLower() == name.ToLower() && m.MedicineId != excludeId.Value);
            
            return await _context.Medicines.AnyAsync(m => m.Name != null && m.Name.ToLower() == name.ToLower());
        }
    }
}
