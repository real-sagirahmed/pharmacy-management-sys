using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public interface ISalesRepository
    {
        Task<string> GetNextInvoiceCodeAsync();
        Task<IEnumerable<SaleBatchInfoDto>> GetBatchesForMedicineAsync(int medicineId);
        Task<PagedResult<SalesMasterDto>> GetPagedAsync(SaleSearchParameters parameters);
        Task<SalesMasterDto?> GetByIdAsync(int id);
        Task<SalesMasterDto> CreateAsync(SalesMasterDto dto, string username);
        Task<SalesMasterDto> HoldAsync(SalesMasterDto dto, string username);
        Task<bool> DeleteAsync(int id);
    }
}
