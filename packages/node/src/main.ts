/**
 * @attestia/node — Entry point.
 *
 * Bootstraps the Hono app, loads config, starts the HTTP server,
 * and handles graceful shutdown.
 *
 * Fully implemented in Commit 2.
 */

export { AttestiaService } from "./services/attestia-service.js";
export type { AttestiaServiceConfig } from "./services/attestia-service.js";
export { TenantRegistry } from "./services/tenant-registry.js";
export { loadConfig, parseApiKeys, ConfigSchema } from "./config.js";
export type { AppConfig, ParsedApiKey } from "./config.js";

// Types
export * from "./types/index.js";
