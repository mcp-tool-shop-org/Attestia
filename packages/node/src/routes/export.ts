/**
 * Export routes for auditor verification.
 *
 * GET /api/v1/export/events — Stream all events as NDJSON
 * GET /api/v1/export/state  — Current state snapshot + GlobalStateHash
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";

export function createExportRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // GET /api/v1/export/events — NDJSON stream of all events
  routes.get("/events", (c) => {
    const service = c.get("service");
    const events = service.getAllEventsForExport();

    const lines = events.map((e) => JSON.stringify(e)).join("\n");
    const body = events.length > 0 ? lines + "\n" : "";

    return c.text(body, 200, {
      "Content-Type": "application/x-ndjson",
    });
  });

  // GET /api/v1/export/state — State snapshot + GlobalStateHash
  routes.get("/state", (c) => {
    const service = c.get("service");
    const snapshot = service.getStateSnapshot();

    return c.json({ data: snapshot });
  });

  return routes;
}
