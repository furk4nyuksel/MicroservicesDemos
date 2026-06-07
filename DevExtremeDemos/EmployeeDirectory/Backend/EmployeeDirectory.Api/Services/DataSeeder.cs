using Bogus;
using Elastic.Clients.Elasticsearch;
using EmployeeDirectory.Domain.Entities;
using EmployeeDirectory.Domain.Enums;
using EmployeeDirectory.Domain.Interfaces;
using EmployeeDirectory.Infrastructure.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace EmployeeDirectory.Api.Services;

public class DataSeeder : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(IServiceProvider serviceProvider, ILogger<DataSeeder> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Elasticsearch with ICU plugin can take 30-60 seconds to start.
        // Retry with exponential backoff.
        const int maxRetries = 10;
        var delay = TimeSpan.FromSeconds(5);

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IElasticsearchRepository<Employee>>();
        var client = scope.ServiceProvider.GetRequiredService<ElasticsearchClient>();

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                await Task.Delay(delay, stoppingToken);

                _logger.LogInformation("Attempt {Attempt}/{MaxRetries}: Ensuring Elasticsearch index with ICU mappings...", attempt, maxRetries);
                var existsResponse = await client.Indices.ExistsAsync("employees");
                var indexExists = existsResponse.Exists;

                await IndexInitializer.EnsureIndexAsync<Employee>(client, "employees", forceRecreate: false);
                _logger.LogInformation("Index created/verified with ICU collation support.");

                if (!indexExists)
                {
                    // Seed data only if the index was just created
                    _logger.LogInformation("Seeding employee data...");
                    var employees = GenerateFakeEmployees(200);
                    await repository.CreateBulkAsync(employees);
                    _logger.LogInformation("Successfully seeded 200 employees with ICU-ready index.");
                }
                else
                {
                    _logger.LogInformation("Index already exists. Skipping data seeding.");
                }
                
                return; // success – exit the loop
            }
            catch (Exception ex) when (attempt < maxRetries)
            {
                _logger.LogWarning(ex, "Attempt {Attempt} failed. Retrying in {Delay}s...", attempt, delay.TotalSeconds);
                delay = TimeSpan.FromSeconds(Math.Min(delay.TotalSeconds * 1.5, 30));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "All {MaxRetries} attempts to initialize index and seed data have failed.", maxRetries);
            }
        }
    }

    private static System.Collections.Generic.IEnumerable<Employee> GenerateFakeEmployees(int count)
    {
        var faker = new Faker<Employee>("tr")
            .RuleFor(e => e.Id, f => Guid.NewGuid().ToString())
            .RuleFor(e => e.FirstName, f => f.Name.FirstName())
            .RuleFor(e => e.LastName, f => f.Name.LastName())
            .RuleFor(e => e.Department, f => f.Commerce.Department())
            .RuleFor(e => e.Phone, f => f.Phone.PhoneNumber("05## ### ## ##"))
            .RuleFor(e => e.Email, (f, e) => f.Internet.Email(e.FirstName, e.LastName))
            .RuleFor(e => e.EmployeeType, f => f.PickRandom<EmployeeType>())
            .RuleFor(e => e.City, f => f.Address.City())
            .RuleFor(e => e.WorkStatus, f => f.Random.Bool(0.8f)) // 80% active
            .RuleFor(e => e.HireDate, f => f.Date.Past(5));

        return faker.Generate(count);
    }
}
