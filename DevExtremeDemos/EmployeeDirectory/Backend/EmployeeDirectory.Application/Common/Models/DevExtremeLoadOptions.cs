using System.Collections.Generic;
using System.Text.Json;

namespace EmployeeDirectory.Application.Common.Models;

public class DevExtremeLoadOptions
{
    public int Skip { get; set; }
    public int Take { get; set; }
    public bool RequireTotalCount { get; set; }
    
    // DevExtreme sends Sort as a JSON string when using stringify
    // e.g. [{"selector":"firstName","desc":false}]
    public string? Sort { get; set; }
    
    // DevExtreme sends Filter as a JSON string
    // e.g. ["department","contains","IT"] or [["department","=","IT"],"and",["city","=","Istanbul"]]
    public string? Filter { get; set; }
}

public class LoadResult<T>
{
    public IEnumerable<T> Data { get; set; }
    public long TotalCount { get; set; }
}
