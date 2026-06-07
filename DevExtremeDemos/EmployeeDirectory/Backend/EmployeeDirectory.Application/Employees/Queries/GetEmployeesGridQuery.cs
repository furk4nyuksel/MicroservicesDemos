using EmployeeDirectory.Application.Common.Models;
using EmployeeDirectory.Domain.Entities;
using MediatR;

namespace EmployeeDirectory.Application.Employees.Queries;

public class GetEmployeesGridQuery : IRequest<LoadResult<Employee>>
{
    public DevExtremeLoadOptions LoadOptions { get; set; }
}
