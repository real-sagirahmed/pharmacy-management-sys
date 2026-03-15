using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class ManufacturerRepository : IRepository<Manufacturer, ManufacturerDto>
    {
        private readonly ApplicationDbContext _context;

        public ManufacturerRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<ManufacturerDto>> GetAllAsync()
        {
            return await _context.Manufacturers
                .Select(m => new ManufacturerDto
                {
                    ManufacturerId = m.ManufacturerId,
                    Code           = m.Code,
                    Name           = m.Name,
                    Description    = m.Description,
                    IsActive       = m.IsActive
                }).ToListAsync();
        }

        public async Task<ManufacturerDto?> GetByIdAsync(int id)
        {
            var m = await _context.Manufacturers.FindAsync(id);
            if (m == null) return null;
            return new ManufacturerDto
            {
                ManufacturerId = m.ManufacturerId,
                Code           = m.Code,
                Name           = m.Name,
                Description    = m.Description,
                IsActive       = m.IsActive
            };
        }

        public async Task<ManufacturerDto> CreateAsync(ManufacturerDto dto)
        {
            if (await _context.Manufacturers.AnyAsync(m => m.Name == dto.Name))
                throw new InvalidOperationException($"Manufacturer with name '{dto.Name}' already exists.");

            dto.Code = await GetNextCodeAsync("MFG");

            var entity = new Manufacturer
            {
                Code        = dto.Code,
                Name        = dto.Name,
                Description = dto.Description,
                IsActive    = true
            };
            _context.Manufacturers.Add(entity);
            await _context.SaveChangesAsync();
            dto.ManufacturerId = entity.ManufacturerId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.Manufacturers
                .Where(m => m.Code.StartsWith(prefix))
                .OrderByDescending(m => m.Code)
                .Select(m => m.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, ManufacturerDto dto)
        {
            var entity = await _context.Manufacturers.FindAsync(id);
            if (entity == null) return false;

            if (await _context.Manufacturers.AnyAsync(m => m.Code == dto.Code && m.ManufacturerId != id))
                throw new InvalidOperationException($"Another Manufacturer with Code '{dto.Code}' already exists.");

            if (await _context.Manufacturers.AnyAsync(m => m.Name == dto.Name && m.ManufacturerId != id))
                throw new InvalidOperationException($"Another Manufacturer with Name '{dto.Name}' already exists.");

            entity.Code        = dto.Code;
            entity.Name        = dto.Name;
            entity.Description = dto.Description;
            entity.IsActive    = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.Manufacturers.FindAsync(id);
            if (entity == null) return false;
            _context.Manufacturers.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
