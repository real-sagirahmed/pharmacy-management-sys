using Microsoft.EntityFrameworkCore;
using PharmacyApi.Data;
using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public class PartyRepository : IRepository<Party, PartyDto>
    {
        private readonly ApplicationDbContext _context;

        public PartyRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<PartyDto>> GetAllAsync()
        {
            return await _context.Parties
                .Select(p => new PartyDto
                {
                    PartyId   = p.PartyId,
                    Code      = p.Code,
                    PartyType = p.PartyType,
                    FullName  = p.FullName,
                    Cell      = p.Cell,
                    Email     = p.Email,
                    Address   = p.Address,
                    IsActive  = p.IsActive
                }).ToListAsync();
        }

        public async Task<PartyDto?> GetByIdAsync(int id)
        {
            var p = await _context.Parties.FindAsync(id);
            if (p == null) return null;
            return new PartyDto
            {
                PartyId   = p.PartyId,
                Code      = p.Code,
                PartyType = p.PartyType,
                FullName  = p.FullName,
                Cell      = p.Cell,
                Email     = p.Email,
                Address   = p.Address,
                IsActive  = p.IsActive
            };
        }

        public async Task<PartyDto> CreateAsync(PartyDto dto)
        {
            // Auto-generate Code based on PartyType if not already in correct format or if preferred
            // We use the provided PartyType to determine prefix
            string prefix = dto.PartyType == "Customer" ? "CUS" : (dto.PartyType == "Supplier" ? "SUP" : "PTY");
            dto.Code = await GetNextCodeAsync(prefix);

            var entity = new Party
            {
                Code      = dto.Code,
                PartyType = dto.PartyType,
                FullName  = dto.FullName,
                Cell      = dto.Cell,
                Email     = dto.Email,
                Address   = dto.Address,
                IsActive  = true
            };
            _context.Parties.Add(entity);
            await _context.SaveChangesAsync();
            dto.PartyId = entity.PartyId;
            return dto;
        }

        public async Task<string> GetNextCodeAsync(string prefix)
        {
            var lastCode = await _context.Parties
                .Where(p => p.Code.StartsWith(prefix))
                .OrderByDescending(p => p.Code)
                .Select(p => p.Code)
                .FirstOrDefaultAsync();

            if (string.IsNullOrEmpty(lastCode))
            {
                return $"{prefix}0001";
            }

            // Extract number from end (assuming fixed prefix length for simplicity or finding last digits)
            // Pattern: PREFIX0001
            var numericPart = lastCode.Substring(prefix.Length);
            if (int.TryParse(numericPart, out int number))
            {
                return $"{prefix}{(number + 1).ToString("D4")}";
            }

            return $"{prefix}0001";
        }

        public async Task<bool> UpdateAsync(int id, PartyDto dto)
        {
            var entity = await _context.Parties.FindAsync(id);
            if (entity == null) return false;

            // Duplicate Code check (exclude self)
            if (await _context.Parties.AnyAsync(p => p.Code == dto.Code && p.PartyId != id))
                throw new InvalidOperationException($"Another Party with Code '{dto.Code}' already exists.");

            entity.Code      = dto.Code;
            entity.PartyType = dto.PartyType;
            entity.FullName  = dto.FullName;
            entity.Cell      = dto.Cell;
            entity.Email     = dto.Email;
            entity.Address   = dto.Address;
            entity.IsActive  = dto.IsActive;

            _context.Entry(entity).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.Parties.FindAsync(id);
            if (entity == null) return false;
            _context.Parties.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
