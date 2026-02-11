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
