using System.Collections.Generic;
using System.Threading.Tasks;

namespace EmployeeDirectory.Domain.Interfaces;

public interface IElasticsearchRepository<T> where T : class
{
    Task<T> GetByIdAsync(string id);
    Task<IEnumerable<T>> GetAllAsync();
    Task CreateAsync(T entity);
    Task CreateBulkAsync(IEnumerable<T> entities);
    Task UpdateAsync(T entity);
    Task DeleteAsync(string id);
    Task<(IEnumerable<T> Data, long TotalCount)> LoadGridDataAsync(int skip, int take, string filterJson, string sortJson);
}
