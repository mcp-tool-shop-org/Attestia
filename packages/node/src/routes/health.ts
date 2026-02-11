/**
 * Health check routes.
 *
 * GET /health — Liveness probe (always 200 if server is running)
 * GET /ready  — Readiness probe (deep health: event store integrity + writability)
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import type { TenantRegistry } from "../services/tenant-registry.js";

interface SubsystemStatus {
  readonly status: "ok" | "degraded" | "down";
  readonly detail?: string | undefined;
}

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
    const subsystems: Record<string, SubsystemStatus> = {};
    let allReady = true;

    for (const tenantId of tenantIds) {
      const service = tenantRegistry.getOrCreate(tenantId);

      // Deep health: check event store integrity + writability
      const { writable, integrity } = service.checkEventStoreWritable();

      const eventStoreStatus: SubsystemStatus = writable && integrity.valid
        ? { status: "ok" }
        : {
            status: "down",
            detail: `writable=${writable}, chainValid=${integrity.valid}, errors=${integrity.errors.length}`,
          };

      const serviceReady = service.isReady() && eventStoreStatus.status === "ok";

      subsystems[tenantId] = {
        status: serviceReady ? "ok" : "down",
        detail: serviceReady
          ? undefined
          : `eventStore=${eventStoreStatus.status}`,
      };

      if (!serviceReady) {
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
