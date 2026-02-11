/**
 * Middleware barrel — re-exports all middleware.
 */

export { handleError } from "./error-handler.js";
export { requestIdMiddleware, REQUEST_ID_HEADER } from "./request-id.js";
export { loggerMiddleware } from "./logger.js";
export type { RequestLogEntry } from "./logger.js";
export { validateBody } from "./validate.js";
export {
  idempotencyMiddleware,
  InMemoryIdempotencyStore,
  IDEMPOTENCY_HEADER,
} from "./idempotency.js";
export type { IdempotencyStore, CachedResponse } from "./idempotency.js";
export { computeETag, checkIfMatch, setETag } from "./etag.js";
export { authMiddleware, requirePermission, verifyJwt, signJwt } from "./auth.js";
export type { AuthConfig } from "./auth.js";
export { tenantMiddleware } from "./tenant.js";
export {
  rateLimitMiddleware,
  TokenBucketStore,
} from "./rate-limit.js";
export type { RateLimitConfig } from "./rate-limit.js";
export { metricsMiddleware, MetricsCollector } from "./metrics.js";
