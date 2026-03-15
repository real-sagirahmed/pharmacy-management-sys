using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class UseForRepository : IRepository<UseFor, UseForDto>
    {
        private readonly ApplicationDbContext _context;

        public UseForRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<UseForDto>> GetAllAsync()
        {
            return await _context.UseFors
                .Select(u => new UseForDto
                {
                    UseForId = u.UseForId,
                    Code     = u.Code,
                    Name     = u.Name,
                    Remarks  = u.Remarks,
                    IsActive = u.IsActive
                }).ToListAsync();
        }

        public async Task<UseForDto?> GetByIdAsync(int id)
        {
            var u = await _context.UseFors.FindAsync(id);
            if (u == null) return null;
            return new UseForDto
            {
                UseForId = u.UseForId,
                Code     = u.Code,
                Name     = u.Name,
                Remarks  = u.Remarks,
                IsActive = u.IsActive
            };
        }

        public async Task<UseForDto> CreateAsync(UseForDto dto)
        {
            if (await _context.UseFors.AnyAsync(u => u.Name == dto.Name))
                throw new InvalidOperationException($"Indication with name '{dto.Name}' already exists.");

            dto.Code = await GetNextCodeAsync("USF");

            var entity = new UseFor
            {
                Code     = dto.Code,
                Name     = dto.Name,
                Remarks  = dto.Remarks,
                IsActive = true
            };
            _context.UseFors.Add(entity);
            await _context.SaveChangesAsync();
            dto.UseForId = entity.UseForId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.UseFors
                .Where(u => u.Code.StartsWith(prefix))
                .OrderByDescending(u => u.Code)
                .Select(u => u.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, UseForDto dto)
        {
            var entity = await _context.UseFors.FindAsync(id);
            if (entity == null) return false;

            if (await _context.UseFors.AnyAsync(u => u.Code == dto.Code && u.UseForId != id))
                throw new InvalidOperationException($"Another Use For with Code '{dto.Code}' already exists.");

            if (await _context.UseFors.AnyAsync(u => u.Name == dto.Name && u.UseForId != id))
                throw new InvalidOperationException($"Another Use For with Name '{dto.Name}' already exists.");

            entity.Code     = dto.Code;
            entity.Name     = dto.Name;
            entity.Remarks  = dto.Remarks;
            entity.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.UseFors.FindAsync(id);
            if (entity == null) return false;
            _context.UseFors.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
