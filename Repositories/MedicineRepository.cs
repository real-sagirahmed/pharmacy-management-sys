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

            return new MedicineDto
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
                IsActive = m.IsActive,
                CreatedAt = m.CreatedAt,
                CreatedBy = m.CreatedBy,
                UpdatedAt = m.UpdatedAt,
                UpdatedBy = m.UpdatedBy
            };
        }

        public async Task<MedicineDto> CreateAsync(MedicineDto dto, string username)
        {
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
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
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

            entity.Name = dto.Name;
            entity.GenericName = dto.GenericName;
            entity.Category = dto.Category;
            entity.UOM = dto.UOM;
            entity.PurchasePrice = dto.PurchasePrice;
            entity.SalePrice = dto.SalePrice;
            entity.StockQuantity = dto.StockQuantity;
            entity.Batch = dto.Batch;
            entity.ExpiryDate = dto.ExpiryDate;
            entity.IsActive = dto.IsActive;
            entity.UpdatedAt = DateTime.UtcNow;
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

        public async Task<bool> ExistsByNameAsync(string name, int? excludeId = null)
        {
            if (excludeId.HasValue)
                return await _context.Medicines.AnyAsync(m => m.Name.ToLower() == name.ToLower() && m.MedicineId != excludeId.Value);
            
            return await _context.Medicines.AnyAsync(m => m.Name.ToLower() == name.ToLower());
        }
    }
}
