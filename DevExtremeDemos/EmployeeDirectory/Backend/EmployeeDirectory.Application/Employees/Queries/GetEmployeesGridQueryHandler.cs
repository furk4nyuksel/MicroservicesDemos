using System.Threading;
using System.Threading.Tasks;
using EmployeeDirectory.Application.Common.Models;
using EmployeeDirectory.Domain.Entities;
using EmployeeDirectory.Domain.Interfaces;
using MediatR;

namespace EmployeeDirectory.Application.Employees.Queries;

public class GetEmployeesGridQueryHandler : IRequestHandler<GetEmployeesGridQuery, LoadResult<Employee>>
{
    private readonly IElasticsearchRepository<Employee> _repository;

    public GetEmployeesGridQueryHandler(IElasticsearchRepository<Employee> repository)
    {
        _repository = repository;
    }

    public async Task<LoadResult<Employee>> Handle(GetEmployeesGridQuery request, CancellationToken cancellationToken)
    {
        var (data, totalCount) = await _repository.LoadGridDataAsync(
            request.LoadOptions.Skip,
            request.LoadOptions.Take,
            request.LoadOptions.Filter,
            request.LoadOptions.Sort
        );

        return new LoadResult<Employee>
        {
            Data = data,
            TotalCount = request.LoadOptions.RequireTotalCount ? totalCount : 0
        };
    }
}
