/**
 * Health check routes.
 *
 * GET /health — Liveness probe (always 200 if server is running)
 * GET /ready  — Readiness probe (200 if all subsystems initialized)
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import type { TenantRegistry } from "../services/tenant-registry.js";

export function createHealthRoutes(
  tenantRegistry: TenantRegistry,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  routes.get("/ready", (c) => {
    const tenantIds = tenantRegistry.tenantIds();
    const subsystems: Record<string, boolean> = {};

    let allReady = true;
    for (const tenantId of tenantIds) {
      const service = tenantRegistry.getOrCreate(tenantId);
      const ready = service.isReady();
      subsystems[tenantId] = ready;
      if (!ready) {
        allReady = false;
      }
    }

    // If no tenants have been initialized yet, we're still ready
    // (tenants are created on first request)
    if (tenantIds.length === 0) {
      allReady = true;
    }

    const status = allReady ? 200 : 503;

    return c.json(
      {
        status: allReady ? "ready" : "not_ready",
        tenants: tenantIds.length,
        subsystems,
        timestamp: new Date().toISOString(),
      },
      status as 200,
    );
  });

  return routes;
}
