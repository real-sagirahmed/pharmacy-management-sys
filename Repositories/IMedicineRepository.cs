using PharmacyApi.DTOs;

namespace PharmacyApi.Repositories
{
    public interface IMedicineRepository
    {
        Task<PagedResult<MedicineDto>> GetPagedAsync(MedicineSearchParameters parms);
        Task<MedicineDto?> GetByIdAsync(int id);
        Task<MedicineDto> CreateAsync(MedicineDto dto, string username);
        Task<bool> UpdateAsync(int id, MedicineDto dto, string username);
        Task<bool> DeleteAsync(int id);
        Task<string> GetNextCodeAsync();
        Task<bool> ExistsByNameAsync(string name, int? excludeId = null);
    }
}
