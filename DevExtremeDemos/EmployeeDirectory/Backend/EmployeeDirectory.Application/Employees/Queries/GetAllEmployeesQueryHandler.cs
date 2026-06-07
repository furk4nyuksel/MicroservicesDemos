using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using EmployeeDirectory.Domain.Entities;
using EmployeeDirectory.Domain.Interfaces;
using MediatR;

namespace EmployeeDirectory.Application.Employees.Queries;

public class GetAllEmployeesQueryHandler : IRequestHandler<GetAllEmployeesQuery, IEnumerable<Employee>>
{
    private readonly IElasticsearchRepository<Employee> _repository;

    public GetAllEmployeesQueryHandler(IElasticsearchRepository<Employee> repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<Employee>> Handle(GetAllEmployeesQuery request, CancellationToken cancellationToken)
    {
        return await _repository.GetAllAsync();
    }
}
