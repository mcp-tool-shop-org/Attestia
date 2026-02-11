/**
 * Test helpers for @attestia/node.
 *
 * Provides a test app factory that creates a Hono app with
 * all middleware and routes, but no HTTP server.
 */

import { createApp } from "../src/app.js";
import type { AppInstance } from "../src/app.js";

/**
 * Create a test app with default configuration.
 *
 * Uses silent logging and default service config.
 */
export function createTestApp(): AppInstance {
  return createApp({
    serviceConfig: {
      ownerId: "test-tenant",
      defaultCurrency: "USDC",
      defaultDecimals: 6,
    },
  });
}

/**
 * JSON request helper.
 */
export function jsonRequest(
  path: string,
  method: string = "GET",
  body?: unknown,
  headers?: Record<string, string>,
): Request {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new Request(`http://localhost${path}`, init);
}
