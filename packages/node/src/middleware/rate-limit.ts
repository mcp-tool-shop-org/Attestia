/**
 * Rate limiting middleware — token bucket per API key.
 *
 * Each unique identity gets a token bucket with configurable
 * fill rate and burst capacity. Returns 429 with Retry-After
 * header when the bucket is empty.
 */

import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/api-contract.js";
import { createErrorEnvelope } from "../types/error.js";

// =============================================================================
// Token Bucket
// =============================================================================

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitConfig {
  /** Requests per minute (fill rate) */
  readonly rpm: number;
  /** Maximum burst capacity */
  readonly burst: number;
}

export class TokenBucketStore {
  private readonly _buckets = new Map<string, Bucket>();
  private readonly _rpm: number;
  private readonly _burst: number;

  constructor(config: RateLimitConfig) {
    this._rpm = config.rpm;
    this._burst = config.burst;
  }

  /**
   * Try to consume a token for the given identity.
   *
   * @returns Object with `allowed` flag and metadata.
   */
  consume(identity: string): {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
  } {
    const now = Date.now();
    let bucket = this._buckets.get(identity);

    if (bucket === undefined) {
      bucket = { tokens: this._burst, lastRefill: now };
      this._buckets.set(identity, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedMs = now - bucket.lastRefill;
    const tokensToAdd = (elapsedMs / 60000) * this._rpm;
    bucket.tokens = Math.min(this._burst, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        retryAfterMs: 0,
      };
    }

    // Calculate when the next token will be available
    const retryAfterMs = Math.ceil((1 - bucket.tokens) / this._rpm * 60000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  get size(): number {
    return this._buckets.size;
  }

  clear(): void {
    this._buckets.clear();
  }
}

// =============================================================================
// Middleware
// =============================================================================

/**
 * Create rate limiting middleware.
 *
 * Must run AFTER auth middleware. Uses auth.identity as the bucket key.
 */
export function rateLimitMiddleware(
  store: TokenBucketStore,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const auth = c.get("auth");
    const result = store.consume(auth.identity);

    c.header("X-RateLimit-Remaining", String(result.remaining));

    if (!result.allowed) {
      const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
      c.header("Retry-After", String(retryAfterSec));
      return c.json(
        createErrorEnvelope(
          "RATE_LIMITED",
          `Rate limit exceeded. Retry after ${retryAfterSec} seconds.`,
        ),
        429,
      );
    }

    return next();
  };
}
