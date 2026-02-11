/**
 * @attestia/node — Configuration.
 *
 * Loads and validates configuration from environment variables using Zod.
 * Supports optional `.env` file loading when `dotenv` is available.
 */

import { z } from "zod";

// =============================================================================
// Schema
// =============================================================================

export const ConfigSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Auth
  API_KEYS: z.string().default(""),
  JWT_SECRET: z.string().optional(),
  JWT_ISSUER: z.string().default("attestia"),

  // Domain defaults
  DEFAULT_CURRENCY: z.string().default("USDC"),
  DEFAULT_DECIMALS: z.coerce.number().int().min(0).max(18).default(6),

  // Rate limiting
  RATE_LIMIT_RPM: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_BURST: z.coerce.number().int().min(1).default(20),

  // XRPL Witness
  WITNESS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  WITNESS_URL: z.string().optional(),
  WITNESS_SECRET: z.string().optional(),
  WITNESS_ADDRESS: z.string().optional(),

  // Idempotency
  IDEMPOTENCY_TTL_MS: z.coerce.number().int().min(1000).default(86400000),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// =============================================================================
// API Key Parsing
// =============================================================================

export interface ParsedApiKey {
  readonly key: string;
  readonly role: "admin" | "operator" | "viewer";
  readonly tenantId: string;
}

const VALID_ROLES = new Set(["admin", "operator", "viewer"]);

/**
 * Parse the API_KEYS env var into structured records.
 *
 * Format: "key1:role1:tenant1,key2:role2:tenant2"
 */
export function parseApiKeys(raw: string): readonly ParsedApiKey[] {
  if (raw.trim() === "") {
    return [];
  }

  const keys: ParsedApiKey[] = [];

  for (const entry of raw.split(",")) {
    const parts = entry.trim().split(":");
    if (parts.length !== 3) {
      throw new Error(
        `Invalid API_KEYS entry: "${entry.trim()}". Expected format: key:role:tenantId`,
      );
    }

    const [key, role, tenantId] = parts as [string, string, string];

    if (key === "") {
      throw new Error("API key cannot be empty");
    }
    if (!VALID_ROLES.has(role)) {
      throw new Error(
        `Invalid role "${role}" in API_KEYS. Must be: admin, operator, or viewer`,
      );
    }
    if (tenantId === "") {
      throw new Error("Tenant ID cannot be empty in API_KEYS");
    }

    keys.push({ key, role: role as ParsedApiKey["role"], tenantId });
  }

  return keys;
}

// =============================================================================
// Loader
// =============================================================================

/**
 * Load and validate configuration from process.env.
 *
 * @throws {z.ZodError} if required env vars are missing or invalid
 */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): AppConfig {
  return ConfigSchema.parse(env);
}
