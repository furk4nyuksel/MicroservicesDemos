using EmployeeDirectory.Application.Employees.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace EmployeeDirectory.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly IMediator _mediator;

    public EmployeesController(IMediator mediator)
    {
        _mediator = mediator;
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
        Console.WriteLine("PAYLOAD RECEIVED: " + System.Text.Json.JsonSerializer.Serialize(loadOptions));
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
}
