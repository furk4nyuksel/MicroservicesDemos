using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.Aggregations;

namespace EmployeeDirectory.Infrastructure.Repositories {
    public class Test {
        public void M(StringTermsBucket b) {
            var th = b.GetTopHits("items");
        }
    }
}
