using EmployeeDirectory.Application.Employees.Queries;
using EmployeeDirectory.Domain.Entities;
using EmployeeDirectory.Domain.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace EmployeeDirectory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IElasticsearchRepository<Employee> _repository;

    public EmployeesController(IMediator mediator, IElasticsearchRepository<Employee> repository)
    {
        _mediator    = mediator;
        _repository  = repository;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _mediator.Send(new GetAllEmployeesQuery());
        return Ok(result);
    }

    [HttpPost("grid")]
    public async Task<IActionResult> GetGridData([FromBody] EmployeeDirectory.Application.Common.Models.DevExtremeLoadOptions loadOptions)
    {
        var result = await _mediator.Send(new EmployeeDirectory.Application.Employees.Queries.GetEmployeesGridQuery { LoadOptions = loadOptions ?? new EmployeeDirectory.Application.Common.Models.DevExtremeLoadOptions() });
        return Ok(new { data = result.Data, totalCount = result.TotalCount, groupCount = result.GroupCount, summary = result.Summary });
    }

    [HttpPost("seed")]
    public async Task<IActionResult> SeedData([FromQuery] int count = 100)
    {
        var result = await _mediator.Send(new EmployeeDirectory.Application.Employees.Commands.SeedEmployeesCommand { Count = count });
        if (result)
        {
            return Ok(new { message = $"{count} dummy employees generated and pushed to Elastic." });
        }
        return BadRequest(new { message = "Failed to generate dummy data." });
    }

    [HttpGet("suggest")]
    public async Task<IActionResult> Suggest(
        [FromQuery] string field,
        [FromQuery] string query,
        [FromQuery] string op = "contains",
        [FromQuery] int max = 10)
    {
        if (string.IsNullOrWhiteSpace(field) || string.IsNullOrWhiteSpace(query))
            return Ok(System.Array.Empty<string>());

        var result = await _repository.SuggestFieldAsync(field, query, op, max);
        return Ok(result);
    }
}
