using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using EmployeeDirectory.Domain.Models;

namespace EmployeeDirectory.Domain.Interfaces;

public interface IElasticsearchRepository<T> where T : class
{
    Task<T> GetByIdAsync(string id);
    Task<IEnumerable<T>> GetAllAsync();
    Task CreateAsync(T entity);
    Task CreateBulkAsync(IEnumerable<T> entities);
    Task UpdateAsync(T entity);
    Task DeleteAsync(string id);
    Task<(IEnumerable<object> Data, long TotalCount, int GroupCount)> LoadGridDataAsync(
        int skip, 
        int take,
        JsonElement? filter, 
        IEnumerable<SortingInfo>? sort,
        IEnumerable<GroupingInfo>? group);
    Task<IEnumerable<string>> SuggestFieldAsync(string fieldName, string query, string operatorHint, int maxResults = 10);
}
