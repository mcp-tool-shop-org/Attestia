/**
 * Reconciliation and attestation routes.
 *
 * POST /api/v1/reconcile     — Run reconciliation
 * POST /api/v1/attest        — Attest a reconciliation report
 * GET  /api/v1/attestations  — List attestation records
 */

import { Hono } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import { ReconcileSchema, PaginationQuerySchema } from "../types/dto.js";
import { validateBody } from "../middleware/validate.js";
import { paginate } from "../types/pagination.js";
import { createErrorEnvelope } from "../types/error.js";
import type { ReconcileDto } from "../types/dto.js";
import type { ReconciliationInput } from "@attestia/reconciler";

export function createAttestationRoutes(): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  /** Build a ReconciliationInput from the validated DTO. */
  function toReconciliationInput(body: ReconcileDto): ReconciliationInput {
    return {
      intents: body.intents,
      ledgerEntries: body.ledgerEntries,
      chainEvents: body.chainEvents,
      ...(body.scope !== undefined
        ? { scope: body.scope as unknown as ReconciliationInput["scope"] }
        : {}),
    } as ReconciliationInput;
  }

  // POST /api/v1/reconcile
  routes.post("/reconcile", validateBody(ReconcileSchema), (c) => {
    const service = c.get("service");
    const body = c.get("validatedBody") as ReconcileDto;

    const report = service.reconcile(toReconciliationInput(body));

    return c.json({ data: report }, 200);
  });

  // POST /api/v1/attest
  routes.post("/attest", validateBody(ReconcileSchema), async (c) => {
    const service = c.get("service");
    const body = c.get("validatedBody") as ReconcileDto;

    // First reconcile, then attest
    const report = service.reconcile(toReconciliationInput(body));

    const attestation = await service.attest(report);
    return c.json({ data: attestation }, 201);
  });

  // GET /api/v1/attestations
  routes.get("/attestations", (c) => {
    const service = c.get("service");

    const queryResult = PaginationQuerySchema.safeParse(c.req.query());
    if (!queryResult.success) {
      return c.json(
        createErrorEnvelope("VALIDATION_ERROR", "Invalid query parameters"),
        400,
      );
    }

    const query = queryResult.data;
    const attestations = service.listAttestations();

    const result = paginate(
      [...attestations],
      { cursor: query.cursor, limit: query.limit },
      (a) => a.attestedAt,
      "attestedAt",
    );

    return c.json(result);
  });

  return routes;
}
