/**
 * Metrics route.
 *
 * GET /metrics — Prometheus text exposition format.
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import type { MetricsCollector } from "../middleware/metrics.js";

export function createMetricsRoute(
  collector: MetricsCollector,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/metrics", (c) => {
    const body = collector.render();
    return c.text(body, 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    });
  });

  return routes;
}
