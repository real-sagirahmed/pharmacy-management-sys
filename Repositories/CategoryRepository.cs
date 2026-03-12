using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class CategoryRepository : IRepository<Category, CategoryDto>
    {
        private readonly ApplicationDbContext _context;

        public CategoryRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<CategoryDto>> GetAllAsync()
        {
            return await _context.Categories
                .Select(c => new CategoryDto
                {
                    CategoryId  = c.CategoryId,
                    Code        = c.Code,
                    Name        = c.Name,
                    Description = c.Description,
                    IsActive    = c.IsActive
                }).ToListAsync();
        }

        public async Task<CategoryDto?> GetByIdAsync(int id)
        {
            var c = await _context.Categories.FindAsync(id);
            if (c == null) return null;
            return new CategoryDto
            {
                CategoryId  = c.CategoryId,
                Code        = c.Code,
                Name        = c.Name,
                Description = c.Description,
                IsActive    = c.IsActive
            };
        }

        public async Task<CategoryDto> CreateAsync(CategoryDto dto)
        {
            dto.Code = await GetNextCodeAsync("CAT");

            var entity = new Category
            {
                Code        = dto.Code,
                Name        = dto.Name,
                Description = dto.Description,
                IsActive    = true
            };
            _context.Categories.Add(entity);
            await _context.SaveChangesAsync();
            dto.CategoryId = entity.CategoryId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.Categories
                .Where(c => c.Code.StartsWith(prefix))
                .OrderByDescending(c => c.Code)
                .Select(c => c.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode)) return $"{prefix}0001";
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number)) return $"{prefix}{(number + 1).ToString("D4")}";
            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, CategoryDto dto)
        {
            var entity = await _context.Categories.FindAsync(id);
            if (entity == null) return false;

            if (await _context.Categories.AnyAsync(c => c.Code == dto.Code && c.CategoryId != id))
                throw new InvalidOperationException($"Another Category with Code '{dto.Code}' already exists.");

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
            var entity = await _context.Categories.FindAsync(id);
            if (entity == null) return false;
            _context.Categories.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
