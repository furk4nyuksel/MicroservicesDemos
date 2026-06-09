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

    public async Task<(IEnumerable<object> Data, long TotalCount, int GroupCount)> LoadGridDataAsync(
        int skip, 
        int take, 
        System.Text.Json.JsonElement? filter, 
        IEnumerable<EmployeeDirectory.Domain.Models.SortingInfo>? sort,
        IEnumerable<EmployeeDirectory.Domain.Models.GroupingInfo>? group)
    {
        var filterQuery = DevExtremeQueryParser.ParseFilter<T>(filter);
        var sortDescriptor = DevExtremeQueryParser.ParseSort<T>(sort);
        bool isGrouped = group != null && group.Any();

        var response = await _client.SearchAsync<T>(s => 
        {
            s.Index(_indexName);
            s.Query(filterQuery);

            if (isGrouped)
            {
                s.Size(0); // We only need aggregations for grouping
                var groupField = DevExtremeQueryParser.GetGroupField<T>(group!.First().Selector);
                s.Aggregations(a => a
                    .Terms("grouping", t => t
                        .Field(groupField)
                        .Size(100) // Default max number of groups
                    )
                );
            }
            else
            {
                s.From(skip);
                s.Size(take > 0 ? take : 20);

                if (sortDescriptor != null)
                {
                    s.Sort(sortDescriptor);
                }
            }
        });

        if (!response.IsValidResponse)
        {
            return (Enumerable.Empty<object>(), 0, 0);
        }

        if (isGrouped)
        {
            var termsAgg = response.Aggregations?.GetStringTerms("grouping");
            if (termsAgg != null)
            {
                var isDesc = group!.First().Desc;
                var buckets = isDesc ? termsAgg.Buckets.OrderByDescending(b => b.Key).ToList() : termsAgg.Buckets.ToList();

                var groups = buckets.Select(b => new EmployeeDirectory.Domain.Models.GroupItem
                {
                    Key = b.Key,
                    Items = null,
                    Count = b.DocCount,
                    Summary = new object[] { b.DocCount } // Default group summary mapped to Count
                }).ToList();

                var pagedGroups = groups.Skip(skip).Take(take > 0 ? take : groups.Count).ToList();
                return (pagedGroups, response.Total, groups.Count);
            }
        }

        return (response.Documents ?? Enumerable.Empty<object>(), response.Total, 0);
    }
    public async Task<T> GetByIdAsync(string id)
    {
        var response = await _client.GetAsync<T>(id, g => g.Index(_indexName));
        return response.Source;
    }

    public async Task UpdateAsync(T entity)
    {
        await _client.UpdateAsync<T, T>(_indexName, "dummy_id", u => u.Doc(entity));
    }

    /// <summary>
    /// Returns distinct field values matching the given prefix/wildcard query.
    /// Used by the filter panel autocomplete.
    /// </summary>
    public async Task<IEnumerable<string>> SuggestFieldAsync(string fieldName, string query, string operatorHint, int maxResults = 10)
    {
        if (string.IsNullOrWhiteSpace(fieldName) || string.IsNullOrWhiteSpace(query))
            return Enumerable.Empty<string>();

        // Decide wildcard pattern based on operator
        var pattern = operatorHint switch
        {
            "startswith"  => $"{query.ToLowerInvariant()}*",
            "endswith"    => $"*{query.ToLowerInvariant()}",
            "contains"    => $"*{query.ToLowerInvariant()}*",
            _             => $"*{query.ToLowerInvariant()}*", // default: contains
        };

        var keywordField = $"{fieldName}.keyword";

        var response = await _client.SearchAsync<T>(s => s
            .Index(_indexName)
            .Size(0) // only aggregation needed
            .Query(q => q
                .Wildcard(w => w
                    .Field(keywordField)
                    .Wildcard(pattern)
                    .CaseInsensitive(true)
                )
            )
            .Aggregations(a => a
                .Terms("suggestions", t => t
                    .Field(keywordField)
                    .Size(maxResults)
                )
            )
        );

        if (!response.IsValidResponse)
            return Enumerable.Empty<string>();

        var terms = response.Aggregations?.GetStringTerms("suggestions");
        return terms?.Buckets.Select(b => b.Key.ToString()) ?? Enumerable.Empty<string>();
    }
}
