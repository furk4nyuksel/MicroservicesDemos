using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.QueryDsl;

namespace EmployeeDirectory.Infrastructure.Repositories;

/// <summary>
/// Converts DevExtreme DataGrid load options (filter / sort JSON) into
/// Elasticsearch query and sort descriptors.
/// 
/// Fully generic – uses reflection on <typeparamref name="T"/> to decide
/// whether a field is text, numeric, boolean, date or enum so no field
/// names are ever hard-coded.
/// 
/// For locale-aware (ICU) sorting the index must contain a
/// <c>.icu</c> sub-field on every text property (see IndexInitializer).
/// </summary>
public static class DevExtremeQueryParser
{
    // ─── Field type classification ────────────────────────────────────

    private enum FieldKind { Text, Numeric, Boolean, DateTime, Enum, Unknown }

    /// <summary>
    /// Inspects the CLR property on <typeparamref name="T"/> whose camelCase
    /// name matches <paramref name="fieldName"/> and returns its classification.
    /// </summary>
    private static FieldKind GetFieldKind<T>(string? fieldName)
    {
        if (string.IsNullOrWhiteSpace(fieldName)) return FieldKind.Unknown;

        // DevExtreme sends camelCase; C# properties are PascalCase.
        var prop = typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .FirstOrDefault(p => string.Equals(p.Name, fieldName, StringComparison.OrdinalIgnoreCase));

        if (prop == null) return FieldKind.Unknown;

        var type = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;

        if (type == typeof(bool))     return FieldKind.Boolean;
        if (type == typeof(DateTime) || type == typeof(DateTimeOffset)) return FieldKind.DateTime;
        if (type.IsEnum)              return FieldKind.Enum;
        if (type == typeof(string))   return FieldKind.Text;

        // int, long, float, double, decimal …
        if (type.IsPrimitive || type == typeof(decimal)) return FieldKind.Numeric;

        return FieldKind.Unknown;
    }

    /// <summary>
    /// Returns the Elasticsearch field name to use for <b>sorting</b>.
    /// Text / Enum fields go through the <c>.icu</c> sub-field so that
    /// locale-aware collation (e.g. Turkish İ/ı) is applied.
    /// </summary>
    private static string GetSortField(string? field, FieldKind kind)
        => kind is FieldKind.Text or FieldKind.Enum
            ? $"{field}.icu"
            : field ?? string.Empty;

    /// <summary>
    /// Returns the Elasticsearch field name to use for <b>filtering</b>.
    /// Text / Enum fields go through the <c>.keyword</c> sub-field so
    /// that exact / wildcard queries work on un-analyzed tokens.
    /// </summary>
    private static string GetFilterField(string? field, FieldKind kind)
        => kind is FieldKind.Text
            ? $"{field}.keyword"
            : field ?? string.Empty;

    // ─── Filter parsing ───────────────────────────────────────────────

    public static Action<QueryDescriptor<T>> ParseFilter<T>(string? filterJson) where T : class
    {
        if (string.IsNullOrWhiteSpace(filterJson)) return q => q.MatchAll();

        try
        {
            var element = JsonSerializer.Deserialize<JsonElement>(filterJson);
            return BuildQuery<T>(element);
        }
        catch
        {
            return q => q.MatchAll();
        }
    }

    private static Action<QueryDescriptor<T>> BuildQuery<T>(JsonElement element) where T : class
    {
        if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() == 0)
            return q => q.MatchAll();

        // ── Negation wrapper:  ["!", [...]] ──
        if (element.GetArrayLength() == 2
            && element[0].ValueKind == JsonValueKind.String
            && element[0].GetString() == "!")
        {
            var inner = BuildQuery<T>(element[1]);
            return q => q.Bool(b => b.MustNot(inner));
        }

        // ── Simple condition:  ["field", "op", value] ──
        if (element.GetArrayLength() == 3
            && element[0].ValueKind == JsonValueKind.String
            && element[1].ValueKind == JsonValueKind.String)
        {
            return BuildSimpleCondition<T>(element);
        }

        // ── Composite:  [ cond, "and"|"or", cond, ... ] ──
        if (element[0].ValueKind == JsonValueKind.Array)
        {
            return BuildCompositeCondition<T>(element);
        }

        return q => q.MatchAll();
    }

    // ── Simple condition ──────────────────────────────────────────────

    private static Action<QueryDescriptor<T>> BuildSimpleCondition<T>(JsonElement element) where T : class
    {
        var field = element[0].GetString();
        var op    = element[1].GetString()?.ToLowerInvariant();
        var val   = element[2];
        var valStr = val.ToString();

        var kind        = GetFieldKind<T>(field);
        var filterField = GetFilterField(field, kind);

        return q =>
        {
            switch (op)
            {
                // ── Text / wildcard operators ──
                case "contains":
                    if (kind == FieldKind.Text)
                        q.Match(m => m.Field($"{field}.ngram").Query(valStr));
                    else
                        q.Wildcard(w => w.Field(filterField).Wildcard($"*{valStr}*").CaseInsensitive(true));
                    break;

                case "notcontains":
                    if (kind == FieldKind.Text)
                        q.Bool(b => b.MustNot(mq => mq.Match(m => m.Field($"{field}.ngram").Query(valStr))));
                    else
                        q.Bool(b => b.MustNot(mq => mq
                            .Wildcard(w => w.Field(filterField).Wildcard($"*{valStr}*").CaseInsensitive(true))));
                    break;

                case "startswith":
                    q.Wildcard(w => w.Field(filterField).Wildcard($"{valStr}*").CaseInsensitive(true));
                    break;

                case "endswith":
                    q.Wildcard(w => w.Field(filterField).Wildcard($"*{valStr}").CaseInsensitive(true));
                    break;

                // ── Equality ──
                case "=":
                    BuildEquals(q, field!, filterField, kind, val, valStr);
                    break;

                case "<>":
                    q.Bool(b => b.MustNot(mq =>
                    {
                        BuildEquals(mq, field!, filterField, kind, val, valStr);
                    }));
                    break;

                // ── Range operators ──
                case ">":
                    BuildRange(q, field!, kind, valStr, gt: true,  eq: false);
                    break;
                case ">=":
                    BuildRange(q, field!, kind, valStr, gt: true,  eq: true);
                    break;
                case "<":
                    BuildRange(q, field!, kind, valStr, gt: false, eq: false);
                    break;
                case "<=":
                    BuildRange(q, field!, kind, valStr, gt: false, eq: true);
                    break;
            }
        };
    }

    private static void BuildEquals<T>(
        QueryDescriptor<T> q, string rawField, string filterField,
        FieldKind kind, JsonElement val, string valStr) where T : class
    {
        switch (kind)
        {
            case FieldKind.Boolean:
                var boolVal = val.ValueKind == JsonValueKind.True
                    || (val.ValueKind == JsonValueKind.String && bool.TryParse(valStr, out var bv) && bv);
                q.Term(t => t.Field(rawField).Value(boolVal));
                break;

            case FieldKind.Numeric:
            case FieldKind.Enum:
                if (kind == FieldKind.Numeric && decimal.TryParse(valStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var dv))
                    q.Term(t => t.Field(rawField).Value((double)dv));
                else
                    q.Term(t => t.Field(filterField).Value(valStr).CaseInsensitive(true));
                break;

            case FieldKind.DateTime:
                q.Term(t => t.Field(rawField).Value(valStr));
                break;

            default: // Text / Unknown
                q.Term(t => t.Field(filterField).Value(valStr).CaseInsensitive(true));
                break;
        }
    }

    private static void BuildRange<T>(
        QueryDescriptor<T> q, string rawField, FieldKind kind,
        string valStr, bool gt, bool eq) where T : class
    {
        if (kind == FieldKind.DateTime && DateTime.TryParse(valStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
        {
            q.Range(r => r.DateRange(dr =>
            {
                dr.Field(rawField);
                if (gt && eq)  dr.Gte(dt);
                if (gt && !eq) dr.Gt(dt);
                if (!gt && eq) dr.Lte(dt);
                if (!gt && !eq) dr.Lt(dt);
            }));
        }
        else if (decimal.TryParse(valStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var dv))
        {
            var nv = (double)dv;
            q.Range(r => r.NumberRange(nr =>
            {
                nr.Field(rawField);
                if (gt && eq)  nr.Gte(nv);
                if (gt && !eq) nr.Gt(nv);
                if (!gt && eq) nr.Lte(nv);
                if (!gt && !eq) nr.Lt(nv);
            }));
        }
    }

    // ── Composite condition ───────────────────────────────────────────

    private static Action<QueryDescriptor<T>> BuildCompositeCondition<T>(JsonElement element) where T : class
    {
        var queries = new List<Action<QueryDescriptor<T>>>();
        string logicalOp = "and";

        for (int i = 0; i < element.GetArrayLength(); i++)
        {
            var item = element[i];
            if (item.ValueKind == JsonValueKind.Array)
            {
                queries.Add(BuildQuery<T>(item));
            }
            else if (item.ValueKind == JsonValueKind.String)
            {
                var s = item.GetString()?.ToLowerInvariant();
                if (s == "or" || s == "and") logicalOp = s;
            }
        }

        return q => q.Bool(b =>
        {
            if (logicalOp == "or")
            {
                b.Should(queries.ToArray());
                b.MinimumShouldMatch(1);
            }
            else
            {
                b.Must(queries.ToArray());
            }
        });
    }

    // ─── Sort parsing ─────────────────────────────────────────────────

    public static Action<SortOptionsDescriptor<T>>? ParseSort<T>(string? sortJson) where T : class
    {
        if (string.IsNullOrWhiteSpace(sortJson)) return null;

        try
        {
            var element = JsonSerializer.Deserialize<JsonElement>(sortJson);
            if (element.ValueKind != JsonValueKind.Array || element.GetArrayLength() == 0)
                return null;

            return s =>
            {
                foreach (var sortItem in element.EnumerateArray())
                {
                    var selector = sortItem.GetProperty("selector").GetString();
                    var desc = sortItem.TryGetProperty("desc", out var descProp) && descProp.GetBoolean();

                    var kind = GetFieldKind<T>(selector);
                    var sortField = GetSortField(selector, kind);

                    s.Field(sortField, f => f.Order(desc ? SortOrder.Desc : SortOrder.Asc));
                }
            };
        }
        catch
        {
            return null;
        }
    }
}
