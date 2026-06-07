using System.Collections.Generic;
using EmployeeDirectory.Domain.Entities;
using MediatR;

namespace EmployeeDirectory.Application.Employees.Queries;

public class GetAllEmployeesQuery : IRequest<IEnumerable<Employee>>
{
}
