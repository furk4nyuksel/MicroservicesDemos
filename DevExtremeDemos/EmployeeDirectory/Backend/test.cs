using Elastic.Clients.Elasticsearch.QueryDsl;
class Test {
    void T(WildcardQueryDescriptor<object> w) {
        w.Field("f").Wildcard("*a*").CaseInsensitive(true);
    }
}
