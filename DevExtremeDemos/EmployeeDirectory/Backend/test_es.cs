using Elastic.Clients.Elasticsearch;
using Elastic.Transport;

class TestES {
    public async System.Threading.Tasks.Task M() {
        var client = new ElasticsearchClient();
        var response = await client.Transport.RequestAsync<BytesResponse>(HttpMethod.PUT, "myindex", PostData.String("{}"));
    }
}
