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
import { createHealthRoutes } from "./routes/health.js";

// =============================================================================
// App Config
// =============================================================================

export interface CreateAppOptions {
  readonly serviceConfig: AttestiaServiceConfig;
  readonly logFn?: (entry: RequestLogEntry) => void;
}

// =============================================================================
// Factory
// =============================================================================

export interface AppInstance {
  readonly app: Hono<AppEnv>;
  readonly tenantRegistry: TenantRegistry;
}

/**
 * Create the Hono application with all middleware and routes.
 */
export function createApp(options: CreateAppOptions): AppInstance {
  const tenantRegistry = new TenantRegistry(options.serviceConfig);

  const app = new Hono<AppEnv>();

  // ─── Global Middleware ───────────────────────────────────────────
  app.use("*", requestIdMiddleware());

  if (options.logFn !== undefined) {
    app.use("*", loggerMiddleware(options.logFn));
  }

  // ─── Error Handler ──────────────────────────────────────────────
  app.onError(handleError);

  // ─── Routes ─────────────────────────────────────────────────────
  const healthRoutes = createHealthRoutes(tenantRegistry);
  app.route("/", healthRoutes);

  return { app, tenantRegistry };
}
