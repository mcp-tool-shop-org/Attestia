/**
 * Public verification routes — no authentication required.
 *
 * These endpoints allow external verifiers to:
 * 1. Download a state bundle for independent verification
 * 2. Check the system's current health/hash
 *
 * Mounted at /public/v1/verify/* BEFORE auth middleware.
 * Rate limited by IP address (stricter than authenticated limits).
 * CORS enabled for browser-based verifiers.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "../types/api-contract.js";
import { TokenBucketStore } from "../middleware/rate-limit.js";
import {
  publicRateLimitMiddleware,
  PUBLIC_RATE_LIMIT_DEFAULT,
} from "../middleware/public-rate-limit.js";

// =============================================================================
// Types
// =============================================================================

export interface PublicVerifyDeps {
  /** Override public rate limit config */
  readonly rateLimitConfig?: { rpm: number; burst: number };

  /** Callback to generate a state bundle on demand */
  readonly getBundleFn?: () => unknown;
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

  return routes;
}
