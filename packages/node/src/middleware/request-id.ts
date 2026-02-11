/**
 * Request ID middleware.
 *
 * Generates or propagates an X-Request-Id header for request tracing.
 * If the incoming request has an X-Request-Id header, it's preserved.
 * Otherwise, a new UUID is generated.
 */

import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/api-contract.js";

export const REQUEST_ID_HEADER = "X-Request-Id";

export function requestIdMiddleware(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const existing = c.req.header(REQUEST_ID_HEADER);
    const requestId = existing ?? randomUUID();

    c.set("requestId", requestId);

    await next();

    c.header(REQUEST_ID_HEADER, requestId);
  };
}
