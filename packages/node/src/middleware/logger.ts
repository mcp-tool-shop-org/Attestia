/**
 * Structured logging middleware.
 *
 * Uses pino for JSON-structured request logging.
 * Creates a child logger with requestId context per request.
 */

import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/api-contract.js";

export interface RequestLogEntry {
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly durationMs: number;
  readonly requestId: string;
}

/**
 * Creates a pino-based request logging middleware.
 *
 * Logs request start/end with method, path, status, and duration.
 */
export function loggerMiddleware(
  log: (entry: RequestLogEntry) => void,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const start = Date.now();

    await next();

    const entry: RequestLogEntry = {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - start,
      requestId: c.get("requestId"),
    };

    log(entry);
  };
}
