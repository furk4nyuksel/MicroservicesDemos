using Bogus;
using EmployeeDirectory.Domain.Entities;
using EmployeeDirectory.Domain.Enums;
using EmployeeDirectory.Domain.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace EmployeeDirectory.Application.Employees.Commands;

public class SeedEmployeesCommandHandler : IRequestHandler<SeedEmployeesCommand, bool>
{
    private readonly IElasticsearchRepository<Employee> _repository;
    private readonly ILogger<SeedEmployeesCommandHandler> _logger;

    public SeedEmployeesCommandHandler(IElasticsearchRepository<Employee> repository, ILogger<SeedEmployeesCommandHandler> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public async Task<bool> Handle(SeedEmployeesCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var employees = GenerateFakeEmployees(request.Count);
            await _repository.CreateBulkAsync(employees);
            _logger.LogInformation($"Successfully seeded {request.Count} employees manually.");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed dummy data manually.");
            return false;
        }
    }

    private static IEnumerable<Employee> GenerateFakeEmployees(int count)
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
            .RuleFor(e => e.WorkStatus, f => f.Random.Bool(0.8f))
            .RuleFor(e => e.HireDate, f => f.Date.Past(5));

        return faker.Generate(count);
    }
}
