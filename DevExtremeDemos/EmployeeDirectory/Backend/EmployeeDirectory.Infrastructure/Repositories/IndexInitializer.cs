using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;
using Elastic.Clients.Elasticsearch;
using Elastic.Transport;

namespace EmployeeDirectory.Infrastructure.Repositories;

/// <summary>
/// Creates (or re-creates) an Elasticsearch index with ICU-collation and N-Gram
/// sub-fields on every text property of <typeparamref name="T"/>.
/// 
/// This enables locale-aware sorting for ALL languages and high-performance wildcard queries.
/// </summary>
public static class IndexInitializer
{
    public static async Task EnsureIndexAsync<T>(
        ElasticsearchClient client,
        string indexName,
        bool forceRecreate = false) where T : class
    {
        var existsResponse = await client.Indices.ExistsAsync(indexName);

        if (existsResponse.Exists && forceRecreate)
        {
            await client.Indices.DeleteAsync(indexName);
        }
        else if (existsResponse.Exists)
        {
            return; // index already exists, nothing to do
        }

        var mappingJson = BuildMappingJson<T>();

        var body = $$"""
        {
            "settings": {
                "index": {
                    "max_ngram_diff": 10
                },
                "analysis": {
                    "analyzer": {
                        "icu_analyzer": {
                            "type": "custom",
                            "tokenizer": "icu_tokenizer",
                            "filter": ["icu_folding"]
                        },
                        "ngram_analyzer": {
                            "type": "custom",
                            "tokenizer": "ngram_tokenizer",
                            "filter": ["lowercase"]
                        }
                    },
                    "tokenizer": {
                        "ngram_tokenizer": {
                            "type": "ngram",
                            "min_gram": 2,
                            "max_gram": 10,
                            "token_chars": ["letter", "digit"]
                        }
                    }
                }
            },
            "mappings": {
                "properties": {{mappingJson}}
            }
        }
        """;

        var response = await client.Transport.RequestAsync<BytesResponse>(Elastic.Transport.HttpMethod.PUT, indexName, PostData.String(body));

        if (!response.ApiCallDetails.HasSuccessfulStatusCode)
        {
            var error = response.ApiCallDetails.DebugInformation;
            throw new Exception($"Failed to create index '{indexName}': {error}");
        }
    }

    private static string BuildMappingJson<T>() where T : class
    {
        var props = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance);
        var fields = new Dictionary<string, object>();

        foreach (var prop in props)
        {
            var name = char.ToLowerInvariant(prop.Name[0]) + prop.Name[1..]; // camelCase
            var underlyingType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;

            if (underlyingType == typeof(bool))
            {
                fields[name] = new { type = "boolean" };
            }
            else if (underlyingType == typeof(DateTime) || underlyingType == typeof(DateTimeOffset))
            {
                fields[name] = new { type = "date" };
            }
            else if (underlyingType == typeof(int) || underlyingType == typeof(long))
            {
                fields[name] = new { type = "long" };
            }
            else if (underlyingType == typeof(float) || underlyingType == typeof(double))
            {
                fields[name] = new { type = "double" };
            }
            else if (underlyingType == typeof(decimal))
            {
                fields[name] = new { type = "scaled_float", scaling_factor = 100 };
            }
            else if (underlyingType.IsEnum)
            {
                fields[name] = new
                {
                    type = "keyword",
                    fields = new Dictionary<string, object>
                    {
                        ["icu"] = new
                        {
                            type = "icu_collation_keyword",
                            language = "tr",
                            strength = "primary"
                        }
                    }
                };
            }
            else // string and everything else
            {
                fields[name] = new
                {
                    type = "text",
                    fields = new Dictionary<string, object>
                    {
                        ["keyword"] = new
                        {
                            type = "keyword",
                            ignore_above = 256
                        },
                        ["icu"] = new
                        {
                            type = "icu_collation_keyword",
                            language = "tr",
                            strength = "primary"
                        },
                        ["ngram"] = new
                        {
                            type = "text",
                            analyzer = "ngram_analyzer"
                        }
                    }
                };
            }
        }

        return JsonSerializer.Serialize(fields, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        });
    }
}
