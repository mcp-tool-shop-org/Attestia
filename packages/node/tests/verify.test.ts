/**
 * Tests for verification routes.
 *
 * POST /api/v1/verify/replay — Full replay verification
 * POST /api/v1/verify/hash   — Quick hash comparison
 *
 * Uses real domain snapshots from Ledger and StructuralRegistrar
 * to ensure verifyByReplay/verifyHash can process them.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Ledger } from "@attestia/ledger";
import { StructuralRegistrar } from "@attestia/registrum";
import { createTestApp, jsonRequest } from "./setup.js";
import type { AppInstance } from "../src/app.js";

let instance: AppInstance;
let ledgerSnapshot: unknown;
let registrumSnapshot: unknown;

beforeEach(() => {
  instance = createTestApp();

  // Generate valid snapshots from real domain objects
  const ledger = new Ledger();
  ledgerSnapshot = ledger.snapshot();

  const registrar = new StructuralRegistrar({ mode: "legacy" });
  registrumSnapshot = registrar.snapshot();
});

describe("POST /api/v1/verify/replay", () => {
  it("accepts valid replay verification input", async () => {
    const { app } = instance;

    const res = await app.request(
      jsonRequest("/api/v1/verify/replay", "POST", {
        ledgerSnapshot,
        registrumSnapshot,
      }),
    );

    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: { verdict: string } };
    expect(body.data).toBeDefined();
    expect(body.data.verdict).toBeDefined();
  });

  it("returns 400 for missing required fields", async () => {
    const { app } = instance;
    const res = await app.request(
      jsonRequest("/api/v1/verify/replay", "POST", {
        // missing registrumSnapshot
        ledgerSnapshot: {},
      }),
    );

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/verify/hash", () => {
  it("accepts valid hash verification input", async () => {
    const { app } = instance;

    const res = await app.request(
      jsonRequest("/api/v1/verify/hash", "POST", {
        ledgerSnapshot,
        registrumSnapshot,
        expectedHash: "abc123",
      }),
    );

    expect(res.status).toBe(200);

    const body = (await res.json()) as { data: { match: boolean } };
    expect(body.data).toBeDefined();
  });

  it("returns 400 when expectedHash is missing", async () => {
    const { app } = instance;
    const res = await app.request(
      jsonRequest("/api/v1/verify/hash", "POST", {
        ledgerSnapshot: {},
        registrumSnapshot: {},
        // missing expectedHash
      }),
    );

    expect(res.status).toBe(400);
  });
});
