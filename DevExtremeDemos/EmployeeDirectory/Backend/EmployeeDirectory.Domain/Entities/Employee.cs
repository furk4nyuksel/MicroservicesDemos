using System;
using EmployeeDirectory.Domain.Enums;

namespace EmployeeDirectory.Domain.Entities;

public class Employee
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string FullName => $"{FirstName} {LastName}";
    public string Department { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public EmployeeType EmployeeType { get; set; }
    public string City { get; set; } = string.Empty;
    public bool WorkStatus { get; set; } = true; // true = Active, false = Inactive
    public DateTime HireDate { get; set; }
}
