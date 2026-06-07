using System.Text.Json.Serialization;

namespace EmployeeDirectory.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum EmployeeType
{
    Office,
    Hybrid
}
