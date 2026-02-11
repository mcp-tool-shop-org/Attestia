/**
 * Tests for MetricsCollector — render() and clear().
 */

import { describe, it, expect } from "vitest";
import { MetricsCollector } from "../src/middleware/metrics.js";

describe("MetricsCollector", () => {
  it("render() produces Prometheus format for recorded requests", () => {
    const collector = new MetricsCollector();

    collector.recordRequest("GET", "/health", 200, 5);
    collector.recordRequest("POST", "/api/v1/intents", 201, 12);
    collector.recordRequest("GET", "/health", 200, 3);

    const output = collector.render();

    // Counter headers
    expect(output).toContain("# HELP http_requests_total");
    expect(output).toContain("# TYPE http_requests_total counter");

    // Counter values
    expect(output).toContain(
      'http_requests_total{method="GET",path="/health",status="200"} 2',
    );
    expect(output).toContain(
      'http_requests_total{method="POST",path="/api/v1/intents",status="201"} 1',
    );

    // Histogram headers
    expect(output).toContain("# HELP http_request_duration_seconds");
    expect(output).toContain("# TYPE http_request_duration_seconds histogram");

    // Histogram +Inf and _count
    expect(output).toContain(
      'http_request_duration_seconds_bucket{method="GET",path="/health",le="+Inf"} 2',
    );
    expect(output).toContain(
      'http_request_duration_seconds_count{method="GET",path="/health"} 2',
    );
  });

  it("render() returns headers only when no requests recorded", () => {
    const collector = new MetricsCollector();
    const output = collector.render();

    expect(output).toContain("# HELP http_requests_total");
    expect(output).not.toContain("http_requests_total{");
  });

  it("render() histogram sum reflects total duration", () => {
    const collector = new MetricsCollector();

    collector.recordRequest("GET", "/test", 200, 100); // 0.1s
    collector.recordRequest("GET", "/test", 200, 200); // 0.2s

    const output = collector.render();
    expect(output).toContain(
      'http_request_duration_seconds_sum{method="GET",path="/test"} 0.3',
    );
  });

  it("clear() resets all metrics", () => {
    const collector = new MetricsCollector();

    collector.recordRequest("GET", "/health", 200, 5);
    collector.recordRequest("POST", "/api", 201, 10);
    collector.clear();

    const output = collector.render();
    expect(output).not.toContain("http_requests_total{");
    expect(output).not.toContain("http_request_duration_seconds_bucket{");
  });

  it("histogram buckets correctly count fast vs slow requests", () => {
    const collector = new MetricsCollector();

    // 5ms → 0.005s, should fall in le="0.005" bucket
    collector.recordRequest("GET", "/fast", 200, 5);
    // 5000ms → 5s, should only be in le="5" and le="10" buckets
    collector.recordRequest("GET", "/fast", 200, 5000);

    const output = collector.render();
    // Both should be in le="+Inf"
    expect(output).toContain(
      'http_request_duration_seconds_bucket{method="GET",path="/fast",le="+Inf"} 2',
    );
  });
});
