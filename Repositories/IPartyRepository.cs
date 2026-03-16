using PharmacyApi.DTOs;
using PharmacyApi.Models;

namespace PharmacyApi.Repositories
{
    public interface IPartyRepository : IRepository<Party, PartyDto>
    {
        Task<IEnumerable<PartyDto>> SearchAsync(string query, string? type = null);
    }
}
