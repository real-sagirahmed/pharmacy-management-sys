using PharmacyApi.DTOs;

namespace PharmacyApi.Repositories
{
    public interface IPurchaseRepository
    {
        Task<IEnumerable<PurchaseMasterDto>> GetAllAsync();
        Task<PagedResult<PurchaseMasterDto>> GetPagedAsync(PurchaseSearchParameters parameters);
        Task<PurchaseMasterDto?> GetByIdAsync(int id);
        Task<PurchaseMasterDto> CreateAsync(PurchaseMasterDto dto, string username);
        Task<bool> DeleteAsync(int id);
        Task<string> GetNextGrnCodeAsync();
    }
}
