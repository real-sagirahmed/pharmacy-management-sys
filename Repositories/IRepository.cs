namespace PharmacyApi.Repositories
{
    public interface IRepository<T, TDto> where T : class
    {
        Task<IEnumerable<TDto>> GetAllAsync();
        Task<TDto?> GetByIdAsync(int id);
        Task<TDto> CreateAsync(TDto dto);
        Task<bool> UpdateAsync(int id, TDto dto);
        Task<bool> DeleteAsync(int id);
        Task<string> GetNextCodeAsync(string prefix);
    }
}
