/**
 * Public rate limiting middleware — token bucket per IP address.
 *
 * Stricter than the authenticated rate limiter.
 * Uses IP address (from X-Forwarded-For or remote address) as the bucket key.
 * No auth context required — runs before auth middleware.
 */

import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import { createErrorEnvelope } from "../types/error.js";
import { TokenBucketStore } from "./rate-limit.js";
import type { RateLimitConfig } from "./rate-limit.js";

// =============================================================================
// Default Config
// =============================================================================

/**
 * Default public rate limit: 10 requests per minute, burst of 5.
 * Much stricter than authenticated API rate limits.
 */
export const PUBLIC_RATE_LIMIT_DEFAULT: RateLimitConfig = {
  rpm: 10,
  burst: 5,
};

// =============================================================================
// IP Extraction
// =============================================================================

/**
 * Extract the client IP address from a request.
 *
 * Checks X-Forwarded-For first (for reverse proxies),
 * falls back to a generic "unknown" key.
 */
function extractClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can be "client, proxy1, proxy2" — take first
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }

  // Hono doesn't expose remote address directly in all runtimes.
  // Fall back to a stable key for tests / single-client scenarios.
  return "unknown";
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * Create public rate limiting middleware.
 *
 * Does NOT require auth context — uses IP address as the bucket key.
 * Returns 429 with Retry-After header when the bucket is empty.
 */
export function publicRateLimitMiddleware(
  store: TokenBucketStore,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const ip = extractClientIp(c.req.raw);
    const result = store.consume(ip);

    c.header("X-RateLimit-Remaining", String(result.remaining));

    if (!result.allowed) {
      const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
      c.header("Retry-After", String(retryAfterSec));
      return c.json(
        createErrorEnvelope(
          "RATE_LIMITED",
          `Public rate limit exceeded. Retry after ${retryAfterSec} seconds.`,
        ),
        429,
      );
    }

    return next();
  };
}
