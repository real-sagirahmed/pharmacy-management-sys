using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class CommonStrengthRepository : IRepository<CommonStrength, CommonStrengthDto>
    {
        private readonly ApplicationDbContext _context;

        public CommonStrengthRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<CommonStrengthDto>> GetAllAsync()
        {
            return await _context.CommonStrengths
                .Select(s => new CommonStrengthDto
                {
                    CommonStrengthId = s.CommonStrengthId,
                    Code             = s.Code,
                    Name             = s.Name,
                    Description      = s.Description,
                    IsActive         = s.IsActive
                }).ToListAsync();
        }

        public async Task<CommonStrengthDto?> GetByIdAsync(int id)
        {
            var s = await _context.CommonStrengths.FindAsync(id);
            if (s == null) return null;
            return new CommonStrengthDto
            {
                CommonStrengthId = s.CommonStrengthId,
                Code             = s.Code,
                Name             = s.Name,
                Description      = s.Description,
                IsActive         = s.IsActive
            };
        }

        public async Task<CommonStrengthDto> CreateAsync(CommonStrengthDto dto)
        {
            if (await _context.CommonStrengths.AnyAsync(s => s.Name == dto.Name))
                throw new InvalidOperationException($"Strength with name '{dto.Name}' already exists.");

            dto.Code = await GetNextCodeAsync("STR");

            var entity = new CommonStrength
            {
                Code        = dto.Code,
                Name        = dto.Name,
                Description = dto.Description,
                IsActive    = true
            };
            _context.CommonStrengths.Add(entity);
            await _context.SaveChangesAsync();
            dto.CommonStrengthId = entity.CommonStrengthId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.CommonStrengths
                .Where(s => s.Code.StartsWith(prefix))
                .OrderByDescending(s => s.Code)
                .Select(s => s.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, CommonStrengthDto dto)
        {
            var entity = await _context.CommonStrengths.FindAsync(id);
            if (entity == null) return false;

            if (await _context.CommonStrengths.AnyAsync(s => s.Code == dto.Code && s.CommonStrengthId != id))
                throw new InvalidOperationException($"Another Common Strength with Code '{dto.Code}' already exists.");

            if (await _context.CommonStrengths.AnyAsync(s => s.Name == dto.Name && s.CommonStrengthId != id))
                throw new InvalidOperationException($"Another Common Strength with Name '{dto.Name}' already exists.");

            entity.Code        = dto.Code;
            entity.Name        = dto.Name;
            entity.Description = dto.Description;
            entity.IsActive    = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.CommonStrengths.FindAsync(id);
            if (entity == null) return false;
            _context.CommonStrengths.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
