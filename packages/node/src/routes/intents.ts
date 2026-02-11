/**
 * Intent lifecycle routes.
 *
 * POST   /api/v1/intents              — Declare a new intent
 * GET    /api/v1/intents              — List intents (cursor pagination)
 * GET    /api/v1/intents/:id          — Get a single intent
 * POST   /api/v1/intents/:id/approve  — Approve an intent
 * POST   /api/v1/intents/:id/reject   — Reject an intent
 * POST   /api/v1/intents/:id/execute  — Execute an intent
 * POST   /api/v1/intents/:id/verify   — Verify an intent
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import {
  DeclareIntentSchema,
  ApproveIntentSchema,
  RejectIntentSchema,
  ExecuteIntentSchema,
  VerifyIntentSchema,
  ListIntentsQuerySchema,
} from "../types/dto.js";
import { validateBody } from "../middleware/validate.js";
import { setETag } from "../middleware/etag.js";
import { createErrorEnvelope } from "../types/error.js";
import { paginate } from "../types/pagination.js";
import type { DeclareIntentDto, ListIntentsQuery } from "../types/dto.js";
import type { MetricsCollector } from "../middleware/metrics.js";
import type { AuditLog } from "../services/audit-log.js";

export interface IntentRouteDeps {
  readonly metrics?: MetricsCollector | undefined;
  readonly auditLog?: AuditLog | undefined;
}

export function createIntentRoutes(deps?: IntentRouteDeps): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  const metrics = deps?.metrics;
  const auditLog = deps?.auditLog;

  // POST /api/v1/intents — Declare
  routes.post("/", validateBody(DeclareIntentSchema), (c) => {
    const service = c.get("service");
    const body = c.get("validatedBody") as DeclareIntentDto;

    const intent = service.declareIntent(
      body.id,
      body.kind,
      body.description,
      body.params,
      body.envelopeId,
    );

    metrics?.incrementCounter("attestia_intents_total", { action: "declare" });
    auditLog?.append({
      tenantId: intent.declaredBy ?? "unknown",
      action: "declare",
      resourceType: "intent",
      resourceId: body.id,
      actor: "api",
    });

    setETag(c, intent);
    return c.json({ data: intent }, 201);
  });

  // GET /api/v1/intents — List
  routes.get("/", (c) => {
    const service = c.get("service");

    // Parse query params manually (Zod)
    const queryResult = ListIntentsQuerySchema.safeParse(c.req.query());
    if (!queryResult.success) {
      return c.json(
        createErrorEnvelope("VALIDATION_ERROR", "Invalid query parameters"),
        400,
      );
    }

    const query: ListIntentsQuery = queryResult.data;
    const allIntents = service.listIntents(query.status);

    // Sort by declaredAt ascending for stable pagination
    const sorted = [...allIntents].sort((a, b) =>
      a.declaredAt.localeCompare(b.declaredAt),
    );

    const result = paginate(
      sorted,
      { cursor: query.cursor, limit: query.limit },
      (intent) => intent.declaredAt,
      "declaredAt",
    );

    return c.json(result);
  });

  // GET /api/v1/intents/:id — Get one
  routes.get("/:id", (c) => {
    const service = c.get("service");
    const id = c.req.param("id");
    const intent = service.getIntent(id);

    if (intent === undefined) {
      return c.json(
        createErrorEnvelope("NOT_FOUND", `Intent '${id}' not found`),
        404,
      );
    }

    setETag(c, intent);
    return c.json({ data: intent });
  });

  // POST /api/v1/intents/:id/approve
  routes.post("/:id/approve", validateBody(ApproveIntentSchema), (c) => {
    const service = c.get("service");
    const id = c.req.param("id");
    const body = c.get("validatedBody") as { reason?: string };

    const intent = service.approveIntent(id, body.reason);

    metrics?.incrementCounter("attestia_intents_total", { action: "approve" });
    auditLog?.append({
      tenantId: intent.declaredBy ?? "unknown",
      action: "approve",
      resourceType: "intent",
      resourceId: id,
      actor: "api",
    });

    setETag(c, intent);
    return c.json({ data: intent });
  });

  // POST /api/v1/intents/:id/reject
  routes.post("/:id/reject", validateBody(RejectIntentSchema), (c) => {
    const service = c.get("service");
    const id = c.req.param("id");
    const body = c.get("validatedBody") as { reason: string };

    const intent = service.rejectIntent(id, body.reason);

    metrics?.incrementCounter("attestia_intents_total", { action: "reject" });
    auditLog?.append({
      tenantId: intent.declaredBy ?? "unknown",
      action: "reject",
      resourceType: "intent",
      resourceId: id,
      actor: "api",
    });

    setETag(c, intent);
    return c.json({ data: intent });
  });

  // POST /api/v1/intents/:id/execute
  routes.post("/:id/execute", validateBody(ExecuteIntentSchema), (c) => {
    const service = c.get("service");
    const id = c.req.param("id");
    const body = c.get("validatedBody") as {
      chainId: string;
      txHash: string;
    };

    const intent = service.executeIntent(id, body.chainId, body.txHash);

    metrics?.incrementCounter("attestia_intents_total", { action: "execute" });
    auditLog?.append({
      tenantId: intent.declaredBy ?? "unknown",
      action: "execute",
      resourceType: "intent",
      resourceId: id,
      actor: "api",
    });

    setETag(c, intent);
    return c.json({ data: intent });
  });

  // POST /api/v1/intents/:id/verify
  routes.post("/:id/verify", validateBody(VerifyIntentSchema), (c) => {
    const service = c.get("service");
    const id = c.req.param("id");
    const body = c.get("validatedBody") as {
      matched: boolean;
      discrepancies?: string[];
    };

    const intent = service.verifyIntent(id, body.matched, body.discrepancies);

    metrics?.incrementCounter("attestia_intents_total", { action: "verify" });
    auditLog?.append({
      tenantId: intent.declaredBy ?? "unknown",
      action: "verify",
      resourceType: "intent",
      resourceId: id,
      actor: "api",
    });

    setETag(c, intent);
    return c.json({ data: intent });
  });

  return routes;
}
