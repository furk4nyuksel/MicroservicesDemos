FROM docker.elastic.co/elasticsearch/elasticsearch:8.12.0

# Install the ICU analysis plugin for locale-aware sorting & tokenization
RUN bin/elasticsearch-plugin install --batch analysis-icu
