/**
 * Tests for export endpoints.
 *
 * GET /api/v1/export/events — NDJSON event stream
 * GET /api/v1/export/state  — State snapshot + GlobalStateHash
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createTestApp, jsonRequest } from "./setup.js";
import type { AppInstance } from "../src/app.js";

let instance: AppInstance;

beforeEach(() => {
  instance = createTestApp();
});

describe("GET /api/v1/export/events", () => {
  it("returns empty body when no events exist", async () => {
    const { app } = instance;
    const res = await app.request("/api/v1/export/events");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson");

    const text = await res.text();
    expect(text).toBe("");
  });

  it("returns valid NDJSON content type", async () => {
    const { app } = instance;

    const res = await app.request("/api/v1/export/events");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson");

    const text = await res.text();
    // If there are events, each line must be valid JSON
    if (text.trim().length > 0) {
      const lines = text.trim().split("\n");
      for (const line of lines) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty("event");
        expect(parsed).toHaveProperty("streamId");
      }
    }
  });
});

describe("GET /api/v1/export/state", () => {
  it("returns state snapshot with GlobalStateHash", async () => {
    const { app } = instance;
    const res = await app.request("/api/v1/export/state");

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      data: {
        ledgerSnapshot: unknown;
        registrumSnapshot: unknown;
        globalStateHash: {
          hash: string;
          computedAt: string;
          subsystems: { ledger: string; registrum: string };
        };
      };
    };

    expect(body.data.ledgerSnapshot).toBeDefined();
    expect(body.data.registrumSnapshot).toBeDefined();
    expect(body.data.globalStateHash).toBeDefined();
    expect(body.data.globalStateHash.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(body.data.globalStateHash.subsystems.ledger).toMatch(/^[0-9a-f]{64}$/);
    expect(body.data.globalStateHash.subsystems.registrum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("GlobalStateHash is deterministic", async () => {
    const { app } = instance;

    const res1 = await app.request("/api/v1/export/state");
    const body1 = (await res1.json()) as {
      data: { globalStateHash: { hash: string } };
    };

    const res2 = await app.request("/api/v1/export/state");
    const body2 = (await res2.json()) as {
      data: { globalStateHash: { hash: string } };
    };

    expect(body1.data.globalStateHash.hash).toBe(body2.data.globalStateHash.hash);
  });
});
