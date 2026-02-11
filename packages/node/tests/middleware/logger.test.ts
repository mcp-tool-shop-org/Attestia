/**
 * Tests for logger middleware.
 */

import { describe, it, expect, vi } from "vitest";
import { createTestApp, jsonRequest } from "../setup.js";
import type { RequestLogEntry } from "../../src/middleware/logger.js";
import { createApp } from "../../src/app.js";

describe("loggerMiddleware", () => {
  it("calls logFn with request details", async () => {
    const entries: RequestLogEntry[] = [];
    const { app } = createApp({
      serviceConfig: {
        ownerId: "test",
        defaultCurrency: "USDC",
        defaultDecimals: 6,
      },
      logFn: (entry) => entries.push(entry),
    });

    await app.request("/health");

    expect(entries).toHaveLength(1);
    expect(entries[0]!.method).toBe("GET");
    expect(entries[0]!.path).toBe("/health");
    expect(entries[0]!.status).toBe(200);
    expect(entries[0]!.durationMs).toBeGreaterThanOrEqual(0);
    expect(entries[0]!.requestId).toBeDefined();
  });

  it("logs POST requests with correct status", async () => {
    const entries: RequestLogEntry[] = [];
    const { app } = createApp({
      serviceConfig: {
        ownerId: "test",
        defaultCurrency: "USDC",
        defaultDecimals: 6,
      },
      logFn: (entry) => entries.push(entry),
    });

    await app.request(
      jsonRequest("/api/v1/intents", "POST", {
        id: "log-test-1",
        kind: "transfer",
        description: "Logger test",
        params: {},
      }),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]!.method).toBe("POST");
    expect(entries[0]!.status).toBe(201);
  });
});
