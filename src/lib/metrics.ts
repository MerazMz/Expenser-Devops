import client from "prom-client";

// Use a global singleton to prevent re-initialization across hot reloads
// and multiple server action invocations
const globalForMetrics = globalThis as unknown as {
  metricsInitialized?: boolean;
};

if (!globalForMetrics.metricsInitialized) {
  // Collect default Node.js metrics (CPU, memory, event loop, GC, etc.)
  client.collectDefaultMetrics({
    prefix: "expenser_",
  });
  globalForMetrics.metricsInitialized = true;
}

// --- Custom Application Metrics ---

// Total HTTP requests counter (labeled by method, route, status)
export const httpRequestsTotal = new client.Counter({
  name: "expenser_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"] as const,
});

// HTTP request duration histogram (labeled by method, route, status)
export const httpRequestDuration = new client.Histogram({
  name: "expenser_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Active requests gauge
export const httpActiveRequests = new client.Gauge({
  name: "expenser_http_active_requests",
  help: "Number of active HTTP requests currently being processed",
});

// Auth-specific metrics
export const authAttemptsTotal = new client.Counter({
  name: "expenser_auth_attempts_total",
  help: "Total authentication attempts",
  labelNames: ["method", "result"] as const,
});

// Database connection errors
export const dbErrorsTotal = new client.Counter({
  name: "expenser_db_errors_total",
  help: "Total database connection/query errors",
});

// Export the registry for the /api/metrics endpoint
export const register = client.register;
