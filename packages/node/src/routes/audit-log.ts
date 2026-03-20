/**
 * Audit log query routes.
 *
 * GET /api/v1/audit-logs — List audit entries (tenant-scoped, requires read permission)
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import { requirePermission } from "../middleware/auth.js";
import type { AuditLog } from "../services/audit-log.js";

export function createAuditLogRoutes(auditLog: AuditLog): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/", requirePermission("read"), (c) => {
    const auth = c.get("auth");
    const limit = parseInt(c.req.query("limit") ?? "100", 10);

    const entries = auditLog.query({
      tenantId: auth.tenantId,
      limit: Math.min(Math.max(limit, 1), 1000),
    });

    return c.json({ data: entries });
  });

  return routes;
}
