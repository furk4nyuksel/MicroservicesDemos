using MediatR;

namespace EmployeeDirectory.Application.Employees.Commands;

public class SeedEmployeesCommand : IRequest<bool>
{
    public int Count { get; set; } = 5000;
}
