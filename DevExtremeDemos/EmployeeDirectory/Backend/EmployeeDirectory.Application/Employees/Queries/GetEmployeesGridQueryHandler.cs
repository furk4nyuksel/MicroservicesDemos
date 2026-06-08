using System.Threading;
using System.Threading.Tasks;
using EmployeeDirectory.Application.Common.Models;
using EmployeeDirectory.Domain.Entities;
using EmployeeDirectory.Domain.Interfaces;
using MediatR;

namespace EmployeeDirectory.Application.Employees.Queries;

public class GetEmployeesGridQueryHandler : IRequestHandler<GetEmployeesGridQuery, LoadResult>
{
    private readonly IElasticsearchRepository<Employee> _repository;

    public GetEmployeesGridQueryHandler(IElasticsearchRepository<Employee> repository)
    {
        _repository = repository;
    }

    public async Task<LoadResult> Handle(GetEmployeesGridQuery request, CancellationToken cancellationToken)
    {
        var (data, totalCount, groupCount) = await _repository.LoadGridDataAsync(
            request.LoadOptions.Skip,
            request.LoadOptions.Take,
            request.LoadOptions.Filter,
            request.LoadOptions.Sort,
            request.LoadOptions.Group
        );

        object[]? summary = null;
        if (request.LoadOptions.TotalSummary != null && request.LoadOptions.TotalSummary.Length > 0)
        {
            summary = new object[request.LoadOptions.TotalSummary.Length];
            for (int i = 0; i < request.LoadOptions.TotalSummary.Length; i++)
            {
                var sumReq = request.LoadOptions.TotalSummary[i];
                if (sumReq.SummaryType == "count")
                {
                    summary[i] = totalCount;
                }
                else
                {
                    summary[i] = 0;
                }
            }
        }

        return new LoadResult
        {
            Data = data,
            TotalCount = request.LoadOptions.RequireTotalCount ? totalCount : 0,
            GroupCount = request.LoadOptions.RequireGroupCount ? groupCount : 0,
            Summary = summary
        };
    }
}
