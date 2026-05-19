# Monitoring & Observability Guide

This guide details the integrated metrics and logging architecture of Expenser, explaining how telemetry data is collected, routed, stored, and visualized.

---

## 🛠️ Telemetry Component Breakdown

Our observability suite runs inside isolated containers, collaborating seamlessly in a shared Docker bridge network:

1. **Next.js Instrumenter (`prom-client`)**: Lightweight client integrated into Next.js that tracks HTTP requests, active processes, and exports database latencies.
2. **Prometheus**: Time-series database that pulls metrics from the App, cAdvisor, and Node Exporter every 15 seconds.
3. **cAdvisor (Container Advisor)**: Scrapes resource utilization data (CPU, RAM, Network, Disk I/O) directly from active Docker containers via the `/var/run/docker.sock` socket.
4. **Node Exporter**: Natively interfaces with the host Linux kernel filesystem (`/proc` and `/sys`) to export physical VPS hardware statistics.
5. **Loki**: Micro-storage optimized log aggregator that indexes, stores, and serves runtime logs.
6. **Promtail**: Daemon that tails container logs, attaches labels (e.g., container name, compose service), and ships them to Loki.
7. **Grafana**: Web interface that queries Prometheus and Loki to display interactive dashboards.

---

## 📈 Next.js Custom Prometheus Metrics

The application exposes several customized metrics via `src/lib/metrics.ts` alongside standard Node.js garbage collection and process states:

| Metric Name | Type | Labels | Description |
|-------------|------|--------|-------------|
| `expenser_http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP requests handled |
| `expenser_http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency buckets |
| `expenser_http_active_requests` | Gauge | — | Currently active HTTP requests |
| `expenser_auth_attempts_total` | Counter | `method`, `result` | Track user login/signup success and failure rates |
| `expenser_db_errors_total` | Counter | — | Total MongoDB connection or query errors |

---

## 📊 Pre-configured Grafana Dashboards

Two premium dashboards are auto-provisioned inside Grafana on start:

### 1. Expenser - Application Metrics
* **Request Volume**: Tracks HTTP requests per second split by status codes.
* **Latency Percentiles**: Displays `p50` (median), `p95` (slowest 5%), and `p99` (worst 1%) request latencies to identify bottlenecked pages.
* **Heap Memory**: Visualizes Node.js memory footprint to detect memory leaks.
* **Event Loop Lag**: Monitors event loop blockages to identify expensive synchronous operations.

### 2. Expenser - Infrastructure & Docker
* **Container CPU & RAM**: Live tracking of how much hardware resource each container is drawing.
* **Network I/O**: Tracks upload/download speed for each isolated service.
* **Host Metrics**: Displays remaining disk space, load average, and active system memory.

---

## 🕵️ Query Cookbook: PromQL & LogQL

Use these pre-tested queries inside Grafana's **Explore** tab to monitor or debug the application.

### 📈 Metrics Queries (PromQL)

#### Get HTTP Error Rate (Non-2xx codes) over the last 5 minutes:
```promql
sum(rate(expenser_http_requests_total{status_code!~"2.."}[5m]))
```

#### Identify the Slowest App Route (95th Latency Percentile):
```promql
histogram_quantile(0.95, sum(rate(expenser_http_request_duration_seconds_bucket[5m])) by (le, route))
```

#### Monitor Container Memory Leaks (relative to limit):
```promql
container_memory_usage_bytes{name="expenser-app"} / container_spec_memory_limit_bytes{name="expenser-app"}
```

---

### 📝 Log Queries (LogQL)

To read logs, open Grafana → **Explore**, set the datasource dropdown to **Loki**, and use these LogQL filters:

#### Stream Live Logs from the Next.js App:
```logql
{container="expenser-app"}
```

#### Find Authentication Failures:
```logql
{container="expenser-app"} |= "Invalid credentials"
```

#### Find Database Disconnections or Errors:
```logql
{container="expenser-app"} |= "MongooseServerSelectionError"
```

#### Monitor Runtime Crashes or Critical Warnings:
```logql
{container="expenser-app"} |~ "(Exception|Error|Failed|warning)"
```

---

## 🚨 Troubleshooting Monitoring

### Q: Why do I see "No Data" inside Grafana panels?
1. **Scrape Lag**: Prometheus scrapes every 15 seconds. Wait 30 seconds after startup for data to populate.
2. **Targets Down**: Visit Prometheus targets (`http://localhost:9090/targets`). If a target is marked as **DOWN**, check the logs of that container (e.g. `docker logs expenser-app`).

### Q: Why does cAdvisor show empty graphs on macOS?
* **OS Limitations**: cAdvisor requires direct access to standard Linux `/sys` and `/proc` filesystems to parse cgroups. Under macOS Docker Desktop, cAdvisor runs inside a virtualized Linux VM, meaning some physical host system metrics might be missing. It will run with **100% full capacity** on any Linux VPS or production server.

### Q: How do I change the default Grafana Port?
If port `3001` is restricted on your firewall or is already in use:
1. Open `docker-compose.monitoring.yml`.
2. Locate the `grafana` service.
3. Change the ports mapping:
   ```yaml
   ports:
     - "your-custom-port:3000"
   ```
4. Restart the stack: `docker compose -f docker-compose.monitoring.yml up -d`
