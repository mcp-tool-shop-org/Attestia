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
import { authMiddleware } from "./middleware/auth.js";
import type { AuthConfig } from "./middleware/auth.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import {
  rateLimitMiddleware,
  TokenBucketStore,
} from "./middleware/rate-limit.js";
import {
  metricsMiddleware,
  MetricsCollector,
} from "./middleware/metrics.js";
import { createHealthRoutes } from "./routes/health.js";
import { createIntentRoutes } from "./routes/intents.js";
import { createEventRoutes } from "./routes/events.js";
import { createVerifyRoutes } from "./routes/verify.js";
import { createAttestationRoutes } from "./routes/attestation.js";
import { createMetricsRoute } from "./routes/metrics.js";

// =============================================================================
// App Config
// =============================================================================

export interface CreateAppOptions {
  readonly serviceConfig: AttestiaServiceConfig;
  readonly logFn?: (entry: RequestLogEntry) => void;
  readonly idempotencyTtlMs?: number;
  /** Default tenant ID used when no auth/tenant middleware is active */
  readonly defaultTenantId?: string;
  /** Auth configuration. When provided, auth middleware is enabled. */
  readonly auth?: AuthConfig;
  /** Rate limit configuration. When provided with auth, rate limiting is enabled. */
  readonly rateLimit?: { rpm: number; burst: number };
  /** Enable metrics collection. Default: true */
  readonly enableMetrics?: boolean;
}

// =============================================================================
// Factory
// =============================================================================

export interface AppInstance {
  readonly app: Hono<AppEnv>;
  readonly tenantRegistry: TenantRegistry;
  readonly idempotencyStore: InMemoryIdempotencyStore;
  readonly metricsCollector: MetricsCollector;
  readonly rateLimitStore?: TokenBucketStore | undefined;
}

/**
 * Create the Hono application with all middleware and routes.
 */
export function createApp(options: CreateAppOptions): AppInstance {
  const tenantRegistry = new TenantRegistry(options.serviceConfig);
  const idempotencyStore = new InMemoryIdempotencyStore(
    options.idempotencyTtlMs ?? 86400000,
  );
  const metricsCollector = new MetricsCollector();
  const defaultTenantId = options.defaultTenantId ?? options.serviceConfig.ownerId;
  const enableMetrics = options.enableMetrics !== false;

  let rateLimitStore: TokenBucketStore | undefined;
  if (options.rateLimit !== undefined) {
    rateLimitStore = new TokenBucketStore(options.rateLimit);
  }

  const app = new Hono<AppEnv>();

  // ─── Global Middleware ───────────────────────────────────────────
  app.use("*", requestIdMiddleware());

  if (options.logFn !== undefined) {
    app.use("*", loggerMiddleware(options.logFn));
  }

  if (enableMetrics) {
    app.use("*", metricsMiddleware(metricsCollector));
  }

  // ─── Error Handler ──────────────────────────────────────────────
  app.onError(handleError);

  // ─── Health Routes (no auth required) ───────────────────────────
  const healthRoutes = createHealthRoutes(tenantRegistry);
  app.route("/", healthRoutes);

  // ─── Metrics Route (no auth for Prometheus scraping) ────────────
  if (enableMetrics) {
    app.route("/", createMetricsRoute(metricsCollector));
  }

  // ─── API Routes ─────────────────────────────────────────────────
  if (options.auth !== undefined) {
    // Secured mode: auth → tenant → rate-limit → idempotency
    app.use("/api/*", authMiddleware(options.auth));
    app.use("/api/*", tenantMiddleware(tenantRegistry));

    if (rateLimitStore !== undefined) {
      app.use("/api/*", rateLimitMiddleware(rateLimitStore));
    }
  } else {
    // Unsecured mode (tests, dev): X-Tenant-Id header or default tenant
    app.use("/api/*", async (c, next) => {
      const tenantId = c.req.header("X-Tenant-Id") ?? defaultTenantId;
      const service = tenantRegistry.getOrCreate(tenantId);
      c.set("service", service);
      await next();
    });
  }

  // Idempotency for POST /api/* requests
  app.use("/api/*", idempotencyMiddleware(idempotencyStore));

  // Mount v1 API routes
  app.route("/api/v1/intents", createIntentRoutes());
  app.route("/api/v1/events", createEventRoutes());
  app.route("/api/v1/verify", createVerifyRoutes());
  app.route("/api/v1", createAttestationRoutes());

  return { app, tenantRegistry, idempotencyStore, metricsCollector, rateLimitStore };
}
