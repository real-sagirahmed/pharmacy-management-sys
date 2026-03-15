using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class DosageFormRepository : IRepository<DosageForm, DosageFormDto>
    {
        private readonly ApplicationDbContext _context;

        public DosageFormRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<DosageFormDto>> GetAllAsync()
        {
            return await _context.DosageForms
                .Select(d => new DosageFormDto
                {
                    DosageFormId = d.DosageFormId,
                    Code         = d.Code,
                    Name         = d.Name,
                    Description  = d.Description,
                    IsActive     = d.IsActive
                }).ToListAsync();
        }

        public async Task<DosageFormDto?> GetByIdAsync(int id)
        {
            var d = await _context.DosageForms.FindAsync(id);
            if (d == null) return null;
            return new DosageFormDto
            {
                DosageFormId = d.DosageFormId,
                Code         = d.Code,
                Name         = d.Name,
                Description  = d.Description,
                IsActive     = d.IsActive
            };
        }

        public async Task<DosageFormDto> CreateAsync(DosageFormDto dto)
        {
            if (await _context.DosageForms.AnyAsync(d => d.Name == dto.Name))
                throw new InvalidOperationException($"Dosage Form with name '{dto.Name}' already exists.");

            dto.Code = await GetNextCodeAsync("DSG");

            var entity = new DosageForm
            {
                Code        = dto.Code,
                Name        = dto.Name,
                Description = dto.Description,
                IsActive    = true
            };
            _context.DosageForms.Add(entity);
            await _context.SaveChangesAsync();
            dto.DosageFormId = entity.DosageFormId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.DosageForms
                .Where(d => d.Code.StartsWith(prefix))
                .OrderByDescending(d => d.Code)
                .Select(d => d.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, DosageFormDto dto)
        {
            var entity = await _context.DosageForms.FindAsync(id);
            if (entity == null) return false;

            if (await _context.DosageForms.AnyAsync(d => d.Code == dto.Code && d.DosageFormId != id))
                throw new InvalidOperationException($"Another Dosage Form with Code '{dto.Code}' already exists.");

            if (await _context.DosageForms.AnyAsync(d => d.Name == dto.Name && d.DosageFormId != id))
                throw new InvalidOperationException($"Another Dosage Form with Name '{dto.Name}' already exists.");

            entity.Code        = dto.Code;
            entity.Name        = dto.Name;
            entity.Description = dto.Description;
            entity.IsActive    = dto.IsActive;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.DosageForms.FindAsync(id);
            if (entity == null) return false;
            _context.DosageForms.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
