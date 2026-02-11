/**
 * Hono application factory.
 *
 * Creates the Hono app with middleware and routes.
 * Separated from main.ts for testability — tests create the app
 * without starting the HTTP server.
 */

import { Hono } from "hono";
import type { AppEnv } from "./types/api-contract.js";
import { TenantRegistry } from "./services/tenant-registry.js";
import type { AttestiaServiceConfig } from "./services/attestia-service.js";
import { handleError } from "./middleware/error-handler.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { loggerMiddleware } from "./middleware/logger.js";
import type { RequestLogEntry } from "./middleware/logger.js";
import {
  idempotencyMiddleware,
  InMemoryIdempotencyStore,
} from "./middleware/idempotency.js";
import { createHealthRoutes } from "./routes/health.js";
import { createIntentRoutes } from "./routes/intents.js";
import { createEventRoutes } from "./routes/events.js";
import { createVerifyRoutes } from "./routes/verify.js";
import { createAttestationRoutes } from "./routes/attestation.js";

// =============================================================================
// App Config
// =============================================================================

export interface CreateAppOptions {
  readonly serviceConfig: AttestiaServiceConfig;
  readonly logFn?: (entry: RequestLogEntry) => void;
  readonly idempotencyTtlMs?: number;
  /** Default tenant ID used when no auth/tenant middleware is active */
  readonly defaultTenantId?: string;
}

// =============================================================================
// Factory
// =============================================================================

export interface AppInstance {
  readonly app: Hono<AppEnv>;
  readonly tenantRegistry: TenantRegistry;
  readonly idempotencyStore: InMemoryIdempotencyStore;
}

/**
 * Create the Hono application with all middleware and routes.
 */
export function createApp(options: CreateAppOptions): AppInstance {
  const tenantRegistry = new TenantRegistry(options.serviceConfig);
  const idempotencyStore = new InMemoryIdempotencyStore(
    options.idempotencyTtlMs ?? 86400000,
  );
  const defaultTenantId = options.defaultTenantId ?? options.serviceConfig.ownerId;

  const app = new Hono<AppEnv>();

  // ─── Global Middleware ───────────────────────────────────────────
  app.use("*", requestIdMiddleware());

  if (options.logFn !== undefined) {
    app.use("*", loggerMiddleware(options.logFn));
  }

  // ─── Error Handler ──────────────────────────────────────────────
  app.onError(handleError);

  // ─── Health Routes (no auth required) ───────────────────────────
  const healthRoutes = createHealthRoutes(tenantRegistry);
  app.route("/", healthRoutes);

  // ─── API Routes ─────────────────────────────────────────────────
  // Tenant resolution middleware for /api/* routes.
  // In Commit 4, this is replaced by auth + tenant middleware.
  // For now, use X-Tenant-Id header or default tenant.
  app.use("/api/*", async (c, next) => {
    const tenantId = c.req.header("X-Tenant-Id") ?? defaultTenantId;
    const service = tenantRegistry.getOrCreate(tenantId);
    c.set("service", service);
    await next();
  });

  // Idempotency for POST /api/* requests
  app.use("/api/*", idempotencyMiddleware(idempotencyStore));

  // Mount v1 API routes
  app.route("/api/v1/intents", createIntentRoutes());
  app.route("/api/v1/events", createEventRoutes());
  app.route("/api/v1/verify", createVerifyRoutes());
  app.route("/api/v1", createAttestationRoutes());

  return { app, tenantRegistry, idempotencyStore };
}
