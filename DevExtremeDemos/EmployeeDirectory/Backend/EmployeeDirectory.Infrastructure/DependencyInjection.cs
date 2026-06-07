using Elastic.Clients.Elasticsearch;
using Elastic.Transport;
using EmployeeDirectory.Domain.Interfaces;
using EmployeeDirectory.Infrastructure.Repositories;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System;

namespace EmployeeDirectory.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var elasticUrl = configuration["ElasticSearch:Url"] ?? "http://localhost:9200";
        var settings = new ElasticsearchClientSettings(new Uri(elasticUrl))
            .DefaultMappingFor<Domain.Entities.Employee>(m => m
                .IndexName("employees")
                .IdProperty(e => e.Id)
            );
        
        var client = new ElasticsearchClient(settings);
        services.AddSingleton(client);

        services.AddScoped(typeof(IElasticsearchRepository<>), typeof(ElasticsearchRepository<>));

        return services;
    }
}
