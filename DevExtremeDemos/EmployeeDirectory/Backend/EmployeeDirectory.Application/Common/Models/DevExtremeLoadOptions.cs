using System.Collections.Generic;
using System.Text.Json;
using EmployeeDirectory.Domain.Models;

namespace EmployeeDirectory.Application.Common.Models;

public class DevExtremeLoadOptions
{
    //
    // Summary:
    //     A global default value for the DevExtreme.AspNet.Data.DataSourceLoadOptionsBase.StringToLower
    //     property
    public static bool? StringToLowerDefault { get; set; }

    //
    // Summary:
    //     A flag indicating whether the total number of data objects is required.
    public bool RequireTotalCount { get; set; }

    //
    // Summary:
    //     A flag indicating whether the number of top-level groups is required.
    public bool RequireGroupCount { get; set; }

    //
    // Summary:
    //     A flag indicating whether the current query is made to get the total number of
    //     data objects.
    public bool IsCountQuery { get; set; }

    public bool IsSummaryQuery { get; set; }

    //
    // Summary:
    //     The number of data objects to be skipped from the start of the resulting set.
    public int Skip { get; set; }

    //
    // Summary:
    //     The number of data objects to be loaded.
    public int Take { get; set; }

    //
    // Summary:
    //     A sort expression.
    public SortingInfo[]? Sort { get; set; }

    //
    // Summary:
    //     A group expression.
    public GroupingInfo[]? Group { get; set; }

    //
    // Summary:
    //     A filter expression. System.Text.Json ile native karmaşık (nested) dizileri karşılamak için JsonElement kullanıldı.
    public JsonElement? Filter { get; set; }

    //
    // Summary:
    //     A total summary expression.
    public SummaryInfo[]? TotalSummary { get; set; }

    //
    // Summary:
    //     A group summary expression.
    public SummaryInfo[]? GroupSummary { get; set; }

    //
    // Summary:
    //     A select expression.
    public string[]? Select { get; set; }

    //
    // Summary:
    //     An array of data fields that limits the DevExtreme.AspNet.Data.DataSourceLoadOptionsBase.Select
    //     expression. The applied select expression is the intersection of DevExtreme.AspNet.Data.DataSourceLoadOptionsBase.PreSelect
    //     and DevExtreme.AspNet.Data.DataSourceLoadOptionsBase.Select.
    public string[]? PreSelect { get; set; }

    //
    // Summary:
    //     A flag that indicates whether the LINQ provider should execute the select expression.
    //     If set to false, the select operation is performed in memory.
    public bool? RemoteSelect { get; set; }

    //
    // Summary:
    //     A flag that indicates whether the LINQ provider should execute grouping. If set
    //     to false, the entire dataset is loaded and grouped in memory.
    public bool? RemoteGrouping { get; set; }

    public bool? ExpandLinqSumType { get; set; }

    //
    // Summary:
    //     An array of primary keys.
    public string[]? PrimaryKey { get; set; }

    //
    // Summary:
    //     The data field to be used for sorting by default.
    public string? DefaultSort { get; set; }

    //
    // Summary:
    //     A flag that indicates whether filter expressions should include a ToLower() call
    //     that makes string comparison case-insensitive. Defaults to true for LINQ to Objects,
    //     false for any other provider.
    public bool? StringToLower { get; set; }

    //
    // Summary:
    //     If this flag is enabled, keys and data are loaded via separate queries. This
    //     may result in a more efficient SQL execution plan.
    public bool? PaginateViaPrimaryKey { get; set; }

    public bool? SortByPrimaryKey { get; set; }

    public bool AllowAsyncOverSync { get; set; }
}



public class LoadResult
{
    public IEnumerable<object> Data { get; set; }
    public long TotalCount { get; set; }
    public int GroupCount { get; set; }
    public object[]? Summary { get; set; }
}
