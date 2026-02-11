/**
 * @attestia/node — Entry point.
 *
 * Bootstraps the Hono app, loads config, starts the HTTP server,
 * and handles graceful shutdown.
 */

import { serve } from "@hono/node-server";
import pino from "pino";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";

// =============================================================================
// Re-exports (package public API)
// =============================================================================

export { AttestiaService } from "./services/attestia-service.js";
export type { AttestiaServiceConfig } from "./services/attestia-service.js";
export { TenantRegistry } from "./services/tenant-registry.js";
export { loadConfig, parseApiKeys, ConfigSchema } from "./config.js";
export type { AppConfig, ParsedApiKey } from "./config.js";
export { createApp } from "./app.js";
export type { CreateAppOptions, AppInstance } from "./app.js";
export * from "./types/index.js";

// =============================================================================
// Bootstrap
// =============================================================================

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = pino({
    level: config.LOG_LEVEL,
    ...(config.NODE_ENV === "development"
      ? { transport: { target: "pino-pretty" } }
      : {}),
  });

  const { app, tenantRegistry } = createApp({
    serviceConfig: {
      ownerId: "default",
      defaultCurrency: config.DEFAULT_CURRENCY,
      defaultDecimals: config.DEFAULT_DECIMALS,
    },
    logFn: (entry) => {
      logger.info(entry, `${entry.method} ${entry.path} ${entry.status}`);
    },
  });

  const server = serve({
    fetch: app.fetch,
    port: config.PORT,
    hostname: config.HOST,
  });

  logger.info(
    { port: config.PORT, host: config.HOST },
    "Attestia node started",
  );

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutdown signal received");
    server.close();
    await tenantRegistry.stopAll();
    logger.info("Shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

// Only run when executed directly (not when imported)
main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error("Fatal startup error:", err);
  process.exit(1);
});
