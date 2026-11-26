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
            var m = await _context.Medicines.AsNoTracking().FirstOrDefaultAsync(x => x.MedicineId == id);
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

            // Branch-aware stock batches sourced directly from Tier-2 filtered MedicineBatches
            var branchBatches = await _context.MedicineBatches
                .AsNoTracking()
                .Where(b => b.MedicineId == id && (b.CurrentStock > 0 || b.Status != "Active"))
                .OrderBy(b => b.ExpiryDate)
                .ThenBy(b => b.ReceivedAt)
                .Select(b => new
                {
                    b.BatchNumber,
                    ExpiryDate = b.ExpiryDate.Date,
                    b.CurrentStock,
                    b.PurchasePrice
                })
                .ToListAsync();

            dto.Batches = branchBatches
                .GroupBy(b => new
                {
                    Batch = (string.IsNullOrWhiteSpace(b.BatchNumber) ? "N/A" : b.BatchNumber.Trim().ToUpper()),
                    b.ExpiryDate
                })
                .Select(g => new MedicineBatchDto
                {
                    BatchNumber = g.Key.Batch,
                    ExpiryDate = g.Key.ExpiryDate,
                    RemainingQuantity = g.Sum(x => x.CurrentStock),
                    PurchasePrice = g.Max(x => x.PurchasePrice)
                })
                .OrderBy(b => b.ExpiryDate ?? DateTime.MaxValue)
                .ToList();

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
            var entity = await _context.Medicines.FirstOrDefaultAsync(x => x.MedicineId == id);
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
            var entity = await _context.Medicines.FirstOrDefaultAsync(x => x.MedicineId == id);
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
            return await _context.MedicineBatches
                .AsNoTracking()
                .AnyAsync(mb => mb.MedicineId == medicineId && mb.BatchNumber.ToLower() == b);
        }

        public async Task<bool> ExistsByNameAsync(string name, int? excludeId = null)
        {
            if (excludeId.HasValue)
                return await _context.Medicines.AnyAsync(m => m.Name != null && m.Name.ToLower() == name.ToLower() && m.MedicineId != excludeId.Value);
            
            return await _context.Medicines.AnyAsync(m => m.Name != null && m.Name.ToLower() == name.ToLower());
        }
    }
}
