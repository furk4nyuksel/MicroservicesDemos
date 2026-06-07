using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Elastic.Clients.Elasticsearch;
using EmployeeDirectory.Domain.Interfaces;

namespace EmployeeDirectory.Infrastructure.Repositories;

public class ElasticsearchRepository<T> : IElasticsearchRepository<T> where T : class
{
    private readonly ElasticsearchClient _client;
    private readonly string _indexName;

    public ElasticsearchRepository(ElasticsearchClient client)
    {
        _client = client;
        _indexName = typeof(T).Name.ToLower() + "s";
    }

    public async Task CreateAsync(T entity)
    {
        await _client.IndexAsync(entity, idx => idx.Index(_indexName));
    }

    public async Task CreateBulkAsync(IEnumerable<T> entities)
    {
        var bulkResponse = await _client.BulkAsync(b => b
            .Index(_indexName)
            .IndexMany(entities)
        );
        
        if (!bulkResponse.IsValidResponse)
        {
            throw new System.Exception($"Bulk insert failed: {bulkResponse.DebugInformation}");
        }
    }

    public async Task DeleteAsync(string id)
    {
        await _client.DeleteAsync<T>(id, d => d.Index(_indexName));
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        var response = await _client.SearchAsync<T>(s => s
            .Index(_indexName)
            .Size(1000) // Default max size for demo
        );
        
        if (!response.IsValidResponse)
        {
            return Enumerable.Empty<T>();
        }

        return response.Documents ?? Enumerable.Empty<T>();
    }

    public async Task<(IEnumerable<T> Data, long TotalCount)> LoadGridDataAsync(int skip, int take, string filterJson, string sortJson)
    {
        var filterQuery = DevExtremeQueryParser.ParseFilter<T>(filterJson);
        var sortDescriptor = DevExtremeQueryParser.ParseSort<T>(sortJson);

        var response = await _client.SearchAsync<T>(s => 
        {
            s.Index(_indexName);
            s.From(skip);
            s.Size(take > 0 ? take : 20);
            s.Query(filterQuery);

            if (sortDescriptor != null)
            {
                s.Sort(sortDescriptor);
            }
        });

        if (!response.IsValidResponse)
        {
            return (Enumerable.Empty<T>(), 0);
        }

        return (response.Documents ?? Enumerable.Empty<T>(), response.Total);
    }
    public async Task<T> GetByIdAsync(string id)
    {
        var response = await _client.GetAsync<T>(id, g => g.Index(_indexName));
        return response.Source;
    }

    public async Task UpdateAsync(T entity)
    {
        await _client.UpdateAsync<T, T>(_indexName, "dummy_id", u => u.Doc(entity)); // We will need the actual ID for updating.
        // For a generic repo, updating requires the ID. Since this is an MVP for the grid, we mainly need GetAll and BulkInsert.
        // To be safe, if we implement Update, we need the ID property. 
    }
}
