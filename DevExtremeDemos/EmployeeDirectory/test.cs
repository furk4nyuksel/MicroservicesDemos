using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.Aggregations;

public class Test {
    public void M(StringTermsBucket b) {
        var a = b.DocCount;
    }
}
