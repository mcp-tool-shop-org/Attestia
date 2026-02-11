/**
 * Idempotency middleware.
 *
 * Caches POST mutation responses by Idempotency-Key header.
 * If the same key is seen again within the TTL, the cached
 * response is returned instead of re-executing the handler.
 */

import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/api-contract.js";

// =============================================================================
// Idempotency Store Interface
// =============================================================================

export interface CachedResponse {
  readonly status: number;
  readonly body: string;
  readonly headers: Record<string, string>;
  readonly cachedAt: number;
}

export interface IdempotencyStore {
  get(key: string): CachedResponse | undefined;
  set(key: string, response: CachedResponse): void;
}

// =============================================================================
// In-Memory Store
// =============================================================================

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly _cache = new Map<string, CachedResponse>();
  private readonly _ttlMs: number;

  constructor(ttlMs: number = 86400000) {
    this._ttlMs = ttlMs;
  }

  get(key: string): CachedResponse | undefined {
    const entry = this._cache.get(key);
    if (entry === undefined) {
      return undefined;
    }

    if (Date.now() - entry.cachedAt > this._ttlMs) {
      this._cache.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, response: CachedResponse): void {
    this._cache.set(key, response);
  }

  get size(): number {
    return this._cache.size;
  }

  clear(): void {
    this._cache.clear();
  }
}

// =============================================================================
// Middleware
// =============================================================================

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

export function idempotencyMiddleware(
  store: IdempotencyStore,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.req.method !== "POST") {
      return next();
    }

    const idempotencyKey = c.req.header(IDEMPOTENCY_HEADER);
    if (idempotencyKey === undefined) {
      return next();
    }

    const cached = store.get(idempotencyKey);
    if (cached !== undefined) {
      for (const [key, value] of Object.entries(cached.headers)) {
        c.header(key, value);
      }
      c.header("X-Idempotent-Replay", "true");
      return c.body(cached.body, cached.status as 200);
    }

    await next();

    if (c.res.status < 400) {
      const clonedRes = c.res.clone();
      const body = await clonedRes.text();
      const headers: Record<string, string> = {};
      clonedRes.headers.forEach((value, key) => {
        headers[key] = value;
      });

      store.set(idempotencyKey, {
        status: clonedRes.status,
        body,
        headers,
        cachedAt: Date.now(),
      });
    }
  };
}
