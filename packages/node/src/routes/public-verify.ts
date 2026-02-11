/**
 * Public verification routes — no authentication required.
 *
 * These endpoints allow external verifiers to:
 * 1. Download a state bundle for independent verification
 * 2. Check the system's current health/hash
 * 3. Submit verification reports
 * 4. View consensus from all submitted reports
 * 5. List submitted reports (paginated)
 *
 * Mounted at /public/v1/verify/* BEFORE auth middleware.
 * Rate limited by IP address (stricter than authenticated limits).
 * CORS enabled for browser-based verifiers.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";
import type { AppEnv } from "../types/api-contract.js";
import { createErrorEnvelope } from "../types/error.js";
import { TokenBucketStore } from "../middleware/rate-limit.js";
import {
  publicRateLimitMiddleware,
  PUBLIC_RATE_LIMIT_DEFAULT,
} from "../middleware/public-rate-limit.js";
import { validateBody } from "../middleware/validate.js";
import { aggregateVerifierReports } from "@attestia/verify";
import type { VerifierReport } from "@attestia/verify";

// =============================================================================
// Validation Schemas
// =============================================================================

const SubmitReportSchema = z.object({
  reportId: z.string().min(1),
  verifierId: z.string().min(1),
  verdict: z.enum(["PASS", "FAIL"]),
  subsystemChecks: z.array(
    z.object({
      subsystem: z.string(),
      expected: z.string(),
      actual: z.string(),
      matches: z.boolean(),
    }),
  ),
  discrepancies: z.array(z.string()),
  bundleHash: z.string().min(1),
  verifiedAt: z.string().min(1),
});

// =============================================================================
// Types
// =============================================================================

export interface PublicVerifyDeps {
  /** Override public rate limit config */
  readonly rateLimitConfig?: { rpm: number; burst: number };

  /** Callback to generate a state bundle on demand */
  readonly getBundleFn?: () => unknown;

  /** Minimum verifiers required for consensus. Default: 1 */
  readonly minimumVerifiers?: number;
}

// =============================================================================
// Route Factory
// =============================================================================

export function createPublicVerifyRoutes(
  deps?: PublicVerifyDeps,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // ─── CORS ──────────────────────────────────────────────────────
  routes.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      maxAge: 86400,
    }),
  );

  // ─── Public Rate Limit ────────────────────────────────────────
  const rateLimitStore = new TokenBucketStore(
    deps?.rateLimitConfig ?? PUBLIC_RATE_LIMIT_DEFAULT,
  );
  routes.use("*", publicRateLimitMiddleware(rateLimitStore));

  // ─── GET /health ──────────────────────────────────────────────
  routes.get("/health", (c) => {
    return c.json({
      data: {
        status: "ok",
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ─── GET /state-bundle ────────────────────────────────────────
  routes.get("/state-bundle", (c) => {
    if (deps?.getBundleFn) {
      const bundle = deps.getBundleFn();
      return c.json({ data: bundle });
    }

    // When no bundle generator is configured, return a minimal placeholder.
    // In production, this would be wired to the actual subsystem snapshots.
    return c.json({
      data: {
        version: 1,
        message: "State bundle endpoint active. Configure getBundleFn for production data.",
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ─── In-Memory Report Store ──────────────────────────────────
  const reports: VerifierReport[] = [];

  // ─── POST /submit-report ───────────────────────────────────────
  routes.post("/submit-report", validateBody(SubmitReportSchema), (c) => {
    const body = c.get("validatedBody") as VerifierReport;

    // Check for duplicate report ID
    if (reports.some((r) => r.reportId === body.reportId)) {
      return c.json(
        createErrorEnvelope(
          "CONFLICT",
          `Report ${body.reportId} already submitted`,
        ),
        409,
      );
    }

    reports.push(body);

    return c.json(
      {
        data: {
          reportId: body.reportId,
          accepted: true,
          totalReports: reports.length,
        },
      },
      201,
    );
  });

  // ─── GET /reports ─────────────────────────────────────────────
  routes.get("/reports", (c) => {
    const cursor = c.req.query("cursor");
    const limitStr = c.req.query("limit");
    const limit = limitStr ? Math.min(Number(limitStr), 100) : 20;

    let startIndex = 0;
    if (cursor) {
      const idx = reports.findIndex((r) => r.reportId === cursor);
      if (idx >= 0) startIndex = idx + 1;
    }

    const page = reports.slice(startIndex, startIndex + limit);
    const nextCursor =
      startIndex + limit < reports.length
        ? reports[startIndex + limit - 1]?.reportId
        : undefined;

    return c.json({
      data: page,
      pagination: {
        total: reports.length,
        limit,
        hasMore: startIndex + limit < reports.length,
        ...(nextCursor ? { nextCursor } : {}),
      },
    });
  });

  // ─── GET /consensus ───────────────────────────────────────────
  routes.get("/consensus", (c) => {
    const minVerifiers = deps?.minimumVerifiers ?? 1;
    const result = aggregateVerifierReports(reports, minVerifiers);

    return c.json({ data: result });
  });

  return routes;
}
