using System.Text.Json.Serialization;

namespace EmployeeDirectory.Domain.Models;

public class SortingInfo
{
    [JsonPropertyName("selector")]
    public string Selector { get; set; }
    
    [JsonPropertyName("desc")]
    public bool Desc { get; set; }
}

public class GroupingInfo : SortingInfo
{
    [JsonPropertyName("groupInterval")]
    public string? GroupInterval { get; set; }
    
    [JsonPropertyName("isExpanded")]
    public bool? IsExpanded { get; set; }
}

public class SummaryInfo
{
    [JsonPropertyName("selector")]
    public string Selector { get; set; }
    
    [JsonPropertyName("summaryType")]
    public string SummaryType { get; set; }
}

public class GroupItem
{
    [JsonPropertyName("key")]
    public object Key { get; set; }

    [JsonPropertyName("items")]
    public object? Items { get; set; }

    [JsonPropertyName("count")]
    public long? Count { get; set; }

    [JsonPropertyName("summary")]
    public object[]? Summary { get; set; }
}
