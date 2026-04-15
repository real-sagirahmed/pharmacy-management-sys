using PharmacyApi.DTOs;

namespace PharmacyApi.Services
{
    public interface IGlobalSearchService
    {
        Task<List<SearchResultDto>> SearchAsync(SearchRequestDto request, string userId);
    }
}
