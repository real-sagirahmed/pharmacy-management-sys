using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class TaxRepository : IRepository<Tax, TaxDto>
    {
        private readonly ApplicationDbContext _context;

        public TaxRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<TaxDto>> GetAllAsync()
        {
            return await _context.Taxes
                .Select(t => new TaxDto
                {
                    TaxId   = t.TaxId,
                    Code    = t.Code,
                    Name    = t.Name,
                    TaxRate = t.TaxRate,
                    Remarks = t.Remarks,
                    IsActive = t.IsActive
                }).ToListAsync();
        }

        public async Task<TaxDto?> GetByIdAsync(int id)
        {
            var t = await _context.Taxes.FindAsync(id);
            if (t == null) return null;
            return new TaxDto
            {
                TaxId   = t.TaxId,
                Code    = t.Code,
                Name    = t.Name,
                TaxRate = t.TaxRate,
                Remarks = t.Remarks,
                IsActive = t.IsActive
            };
        }

        public async Task<TaxDto> CreateAsync(TaxDto dto)
        {
            if (await _context.Taxes.AnyAsync(t => t.Name == dto.Name))
                throw new InvalidOperationException($"Tax with name '{dto.Name}' already exists.");

            dto.Code = await GetNextCodeAsync("TAX");

            var entity = new Tax
            {
                Code    = dto.Code,
                Name    = dto.Name,
                TaxRate = dto.TaxRate,
                Remarks = dto.Remarks,
                IsActive = true
            };
            _context.Taxes.Add(entity);
            await _context.SaveChangesAsync();
            dto.TaxId = entity.TaxId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.Taxes
                .Where(t => t.Code.StartsWith(prefix))
                .OrderByDescending(t => t.Code)
                .Select(t => t.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, TaxDto dto)
        {
            var entity = await _context.Taxes.FindAsync(id);
            if (entity == null) return false;

            if (await _context.Taxes.AnyAsync(t => t.Code == dto.Code && t.TaxId != id))
                throw new InvalidOperationException($"Another Tax with Code '{dto.Code}' already exists.");

            if (await _context.Taxes.AnyAsync(t => t.Name == dto.Name && t.TaxId != id))
                throw new InvalidOperationException($"Another Tax with Name '{dto.Name}' already exists.");

            entity.Code    = dto.Code;
            entity.Name    = dto.Name;
            entity.TaxRate = dto.TaxRate;
            entity.Remarks = dto.Remarks;
            entity.IsActive = dto.IsActive;

            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.Taxes.FindAsync(id);
            if (entity == null) return false;
            _context.Taxes.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
