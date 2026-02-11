/**
 * Compliance Routes Tests
 *
 * Verifies:
 * - List frameworks
 * - Generate SOC 2 report
 * - Generate ISO 27001 report
 * - Public summary (no auth)
 * - Invalid framework → 404
 */

import { describe, it, expect } from "vitest";
import { createApp } from "../../src/app.js";
import type { AppInstance } from "../../src/app.js";

// =============================================================================
// Helpers
// =============================================================================

function createTestApp(): AppInstance {
  return createApp({
    serviceConfig: {
      ownerId: "test-tenant",
      defaultCurrency: "USDC",
      defaultDecimals: 6,
    },
  });
}

function makeRequest(
  path: string,
  method: string = "GET",
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

// =============================================================================
// Framework Listing
// =============================================================================

describe("GET /api/v1/compliance/frameworks", () => {
  it("lists available compliance frameworks", async () => {
    const instance = createTestApp();
    const res = await instance.app.request(
      makeRequest("/api/v1/compliance/frameworks"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{
        id: string;
        name: string;
        version: string;
        controlCount: number;
      }>;
    };

    expect(body.data.length).toBeGreaterThanOrEqual(2);

    const soc2 = body.data.find((f) => f.id === "soc2-type2");
    expect(soc2).toBeDefined();
    expect(soc2!.name).toContain("SOC 2");
    expect(soc2!.controlCount).toBeGreaterThan(0);

    const iso = body.data.find((f) => f.id === "iso27001");
    expect(iso).toBeDefined();
    expect(iso!.name).toContain("27001");
    expect(iso!.controlCount).toBeGreaterThan(0);
  });
});

// =============================================================================
// Report Generation
// =============================================================================

describe("GET /api/v1/compliance/report/:frameworkId", () => {
  it("generates SOC 2 compliance report", async () => {
    const instance = createTestApp();
    const res = await instance.app.request(
      makeRequest("/api/v1/compliance/report/soc2-type2"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        framework: { id: string; name: string };
        evaluations: Array<{
          mapping: { controlId: string };
          passed: boolean;
          evidenceDetail: string;
        }>;
        totalControls: number;
        passedControls: number;
        score: number;
        generatedAt: string;
      };
    };

    expect(body.data.framework.id).toBe("soc2-type2");
    expect(body.data.totalControls).toBeGreaterThan(0);
    expect(body.data.passedControls).toBeGreaterThan(0);
    expect(body.data.score).toBeGreaterThanOrEqual(0);
    expect(body.data.score).toBeLessThanOrEqual(100);
    expect(body.data.generatedAt).toBeTruthy();
    expect(body.data.evaluations.length).toBe(body.data.totalControls);
  });

  it("generates ISO 27001 compliance report", async () => {
    const instance = createTestApp();
    const res = await instance.app.request(
      makeRequest("/api/v1/compliance/report/iso27001"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        framework: { id: string };
        totalControls: number;
        score: number;
      };
    };

    expect(body.data.framework.id).toBe("iso27001");
    expect(body.data.totalControls).toBeGreaterThan(0);
  });

  it("returns 404 for unknown framework", async () => {
    const instance = createTestApp();
    const res = await instance.app.request(
      makeRequest("/api/v1/compliance/report/nonexistent"),
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("nonexistent");
  });

  it("report evaluations include evidence details", async () => {
    const instance = createTestApp();
    const res = await instance.app.request(
      makeRequest("/api/v1/compliance/report/soc2-type2"),
    );

    const body = (await res.json()) as {
      data: {
        evaluations: Array<{
          evidenceDetail: string;
          passed: boolean;
        }>;
      };
    };

    for (const evaluation of body.data.evaluations) {
      expect(evaluation.evidenceDetail).toBeTruthy();
      expect(evaluation.evidenceDetail).toMatch(/\[(PASS|FAIL)\]/);
    }
  });
});

// =============================================================================
// Public Summary
// =============================================================================

describe("GET /public/v1/compliance/summary", () => {
  it("returns compliance summary without auth", async () => {
    const instance = createTestApp();
    const res = await instance.app.request(
      makeRequest("/public/v1/compliance/summary"),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{
        framework: { id: string; name: string };
        totalControls: number;
        implementedControls: number;
        score: number;
        generatedAt: string;
      }>;
    };

    expect(body.data.length).toBeGreaterThanOrEqual(2);

    for (const summary of body.data) {
      expect(summary.framework.id).toBeTruthy();
      expect(summary.framework.name).toBeTruthy();
      expect(summary.totalControls).toBeGreaterThan(0);
      expect(summary.implementedControls).toBeGreaterThan(0);
      expect(summary.score).toBeGreaterThanOrEqual(0);
      expect(summary.generatedAt).toBeTruthy();
    }
  });

  it("does not expose sensitive evaluation details", async () => {
    const instance = createTestApp();
    const res = await instance.app.request(
      makeRequest("/public/v1/compliance/summary"),
    );

    const body = (await res.json()) as { data: unknown[] };

    // Public summary should NOT contain per-control evaluations
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("evidenceDetail");
    expect(raw).not.toContain("evaluations");
  });
});
