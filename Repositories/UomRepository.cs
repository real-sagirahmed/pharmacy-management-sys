using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class UomRepository : IRepository<Uom, UomDto>
    {
        private readonly ApplicationDbContext _context;

        public UomRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<UomDto>> GetAllAsync()
        {
            return await _context.Uoms
                .Select(u => new UomDto
                {
                    UomId       = u.UomId,
                    Code        = u.Code,
                    Name        = u.Name,
                    Description = u.Description,
                    IsActive    = u.IsActive
                }).ToListAsync();
        }

        public async Task<UomDto?> GetByIdAsync(int id)
        {
            var u = await _context.Uoms.FindAsync(id);
            if (u == null) return null;
            return new UomDto
            {
                UomId       = u.UomId,
                Code        = u.Code,
                Name        = u.Name,
                Description = u.Description,
                IsActive    = u.IsActive
            };
        }

        public async Task<UomDto> CreateAsync(UomDto dto)
        {
            if (await _context.Uoms.AnyAsync(u => u.Name == dto.Name))
                throw new InvalidOperationException($"UOM with name '{dto.Name}' already exists.");

            dto.Code = await GetNextCodeAsync("UOM");

            var entity = new Uom
            {
                Code        = dto.Code,
                Name        = dto.Name,
                Description = dto.Description,
                IsActive    = true
            };
            _context.Uoms.Add(entity);
            await _context.SaveChangesAsync();
            dto.UomId = entity.UomId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.Uoms
                .Where(u => u.Code.StartsWith(prefix))
                .OrderByDescending(u => u.Code)
                .Select(u => u.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, UomDto dto)
        {
            var entity = await _context.Uoms.FindAsync(id);
            if (entity == null) return false;

            if (await _context.Uoms.AnyAsync(u => u.Code == dto.Code && u.UomId != id))
                throw new InvalidOperationException($"Another UOM with Code '{dto.Code}' already exists.");

            if (await _context.Uoms.AnyAsync(u => u.Name == dto.Name && u.UomId != id))
                throw new InvalidOperationException($"Another UOM with Name '{dto.Name}' already exists.");

            entity.Code        = dto.Code;
            entity.Name        = dto.Name;
            entity.Description = dto.Description;
            entity.IsActive    = dto.IsActive;

            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.Uoms.FindAsync(id);
            if (entity == null) return false;
            _context.Uoms.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
