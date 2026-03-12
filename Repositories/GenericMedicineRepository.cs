using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    // Named GenericMedicineRepository to avoid conflict with C# generic keyword
    public class GenericMedicineRepository : IRepository<Generic, GenericDto>
    {
        private readonly ApplicationDbContext _context;

        public GenericMedicineRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<GenericDto>> GetAllAsync()
        {
            return await _context.Generics
                .Select(g => new GenericDto
                {
                    GenericId   = g.GenericId,
                    Code        = g.Code,
                    Name        = g.Name,
                    Description = g.Description,
                    IsActive    = g.IsActive
                }).ToListAsync();
        }

        public async Task<GenericDto?> GetByIdAsync(int id)
        {
            var g = await _context.Generics.FindAsync(id);
            if (g == null) return null;
            return new GenericDto
            {
                GenericId   = g.GenericId,
                Code        = g.Code,
                Name        = g.Name,
                Description = g.Description,
                IsActive    = g.IsActive
            };
        }

        public async Task<GenericDto> CreateAsync(GenericDto dto)
        {
            dto.Code = await GetNextCodeAsync("GEN");

            var entity = new Generic
            {
                Code        = dto.Code,
                Name        = dto.Name,
                Description = dto.Description,
                IsActive    = true
            };
            _context.Generics.Add(entity);
            await _context.SaveChangesAsync();
            dto.GenericId = entity.GenericId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.Generics
                .Where(g => g.Code.StartsWith(prefix))
                .OrderByDescending(g => g.Code)
                .Select(g => g.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, GenericDto dto)
        {
            var entity = await _context.Generics.FindAsync(id);
            if (entity == null) return false;

            if (await _context.Generics.AnyAsync(g => g.Code == dto.Code && g.GenericId != id))
                throw new InvalidOperationException($"Another Generic with Code '{dto.Code}' already exists.");

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
            var entity = await _context.Generics.FindAsync(id);
            if (entity == null) return false;
            _context.Generics.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
