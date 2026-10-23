# Scroll Lab: pagination vs infinite scroll

Run (only Docker needed):

    docker compose up --build

- Site: http://localhost:8080  (/pagination and /infinite)
- Prometheus: http://localhost:9095 (scrapes backend:3001/metrics every 5s)

Use both pages (click cards, browse, close the tab), then compare in Prometheus.
Every metric has a `mode` label: `pagination` or `infinite`.

## Metrics
| Metric | Shows |
|---|---|
| ux_items_seen_per_session | how much content people actually looked at |
| ux_click_position | how deep in the list clicked items were |
| ux_time_to_first_click_seconds | how fast people find something |
| ux_session_duration_seconds | engagement time |
| ux_clicks_per_session | engagement/success |
| ux_load_latency_seconds | client-felt loading delay |
| ux_loads_per_session, ux_events_total | navigation effort (page_change vs load_more) |
| items_requests_total, items_served_total, items_response_bytes_total | backend load and data transfer |
| http_request_duration_seconds | API latency |

## Useful PromQL
Average items seen per session:
    sum by (mode)(ux_items_seen_per_session_sum) / sum by (mode)(ux_items_seen_per_session_count)

Average session duration (s):
    sum by (mode)(ux_session_duration_seconds_sum) / sum by (mode)(ux_session_duration_seconds_count)

Average click depth (item index):
    sum by (mode)(ux_click_position_sum) / sum by (mode)(ux_click_position_count)

Average time to first click (s):
    sum by (mode)(ux_time_to_first_click_seconds_sum) / sum by (mode)(ux_time_to_first_click_seconds_count)

Clicks per session:
    sum by (mode)(ux_clicks_per_session_sum) / sum by (mode)(ux_clicks_per_session_count)

p95 client load latency:
    histogram_quantile(0.95, sum by (le, mode)(rate(ux_load_latency_seconds_bucket[5m])))

Backend bytes served per session:
    sum by (mode)(items_response_bytes_total) / sum by (mode)(ux_items_seen_per_session_count)

Items loaded but never seen (wasted data):
    sum by (mode)(items_served_total) - sum by (mode)(ux_items_seen_per_session_sum)
