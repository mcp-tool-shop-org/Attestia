/**
 * SLA Engine Tests
 *
 * Verifies:
 * - All targets met → PASS
 * - One target failed → FAIL
 * - Multiple policies evaluation
 * - Fail-closed: missing metric → FAIL
 * - Edge cases (zero threshold, boundary values)
 * - All threshold operators
 * - Deterministic evaluation
 * - Empty targets
 */

import { describe, it, expect } from "vitest";
import { evaluateSla, evaluateMultipleSla } from "../../src/sla/sla-engine.js";
import type { SlaPolicy, SlaMetrics } from "../../src/sla/types.js";

// =============================================================================
// Fixtures
// =============================================================================

function createPolicy(
  targets: SlaPolicy["targets"],
  overrides?: Partial<SlaPolicy>,
): SlaPolicy {
  return {
    id: "test-policy",
    name: "Test SLA Policy",
    version: 1,
    createdAt: "2025-01-15T00:00:00.000Z",
    targets,
    ...overrides,
  };
}

// =============================================================================
// All Targets Met → PASS
// =============================================================================

describe("SLA Engine: PASS scenarios", () => {
  it("all targets met yields PASS verdict", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
      { metric: "hash_chain_integrity_pct", operator: "gte", threshold: 99.9, window: "7d" },
      { metric: "verification_success_rate_pct", operator: "gte", threshold: 95, window: "24h" },
    ]);

    const metrics: SlaMetrics = {
      replay_time_ms: 200,
      hash_chain_integrity_pct: 100,
      verification_success_rate_pct: 99.5,
    };

    const result = evaluateSla(policy, metrics);

    expect(result.verdict).toBe("PASS");
    expect(result.passedCount).toBe(3);
    expect(result.failedCount).toBe(0);
    expect(result.results).toHaveLength(3);
    expect(result.evaluatedAt).toBeTruthy();
    expect(result.policy.id).toBe("test-policy");
  });

  it("exact threshold values pass with lte/gte", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
      { metric: "hash_chain_integrity_pct", operator: "gte", threshold: 99.9, window: "7d" },
    ]);

    const metrics: SlaMetrics = {
      replay_time_ms: 500,  // exactly at threshold
      hash_chain_integrity_pct: 99.9,  // exactly at threshold
    };

    const result = evaluateSla(policy, metrics);
    expect(result.verdict).toBe("PASS");
    expect(result.passedCount).toBe(2);
  });

  it("empty targets always yields PASS", () => {
    const policy = createPolicy([]);
    const result = evaluateSla(policy, {});

    expect(result.verdict).toBe("PASS");
    expect(result.passedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

// =============================================================================
// One Target Failed → FAIL
// =============================================================================

describe("SLA Engine: FAIL scenarios", () => {
  it("one failed target yields FAIL verdict", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
      { metric: "hash_chain_integrity_pct", operator: "gte", threshold: 99.9, window: "7d" },
    ]);

    const metrics: SlaMetrics = {
      replay_time_ms: 200,  // passes
      hash_chain_integrity_pct: 98.0,  // fails
    };

    const result = evaluateSla(policy, metrics);

    expect(result.verdict).toBe("FAIL");
    expect(result.passedCount).toBe(1);
    expect(result.failedCount).toBe(1);

    const failedTarget = result.results.find((r) => !r.passed)!;
    expect(failedTarget.target.metric).toBe("hash_chain_integrity_pct");
    expect(failedTarget.actualValue).toBe(98.0);
    expect(failedTarget.detail).toContain("FAIL");
  });

  it("all targets failed yields FAIL", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 100, window: "24h" },
      { metric: "verification_success_rate_pct", operator: "gte", threshold: 99, window: "24h" },
    ]);

    const metrics: SlaMetrics = {
      replay_time_ms: 999,
      verification_success_rate_pct: 50,
    };

    const result = evaluateSla(policy, metrics);
    expect(result.verdict).toBe("FAIL");
    expect(result.passedCount).toBe(0);
    expect(result.failedCount).toBe(2);
  });
});

// =============================================================================
// Fail-Closed: Missing Metrics
// =============================================================================

describe("SLA Engine: fail-closed behavior", () => {
  it("missing metric causes target to fail", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
      { metric: "nonexistent_metric", operator: "gte", threshold: 0, window: "24h" },
    ]);

    const metrics: SlaMetrics = {
      replay_time_ms: 200,
      // nonexistent_metric not provided
    };

    const result = evaluateSla(policy, metrics);
    expect(result.verdict).toBe("FAIL");
    expect(result.failedCount).toBe(1);

    const failedTarget = result.results.find((r) => !r.passed)!;
    expect(failedTarget.actualValue).toBeUndefined();
    expect(failedTarget.detail).toContain("not available");
    expect(failedTarget.detail).toContain("fail-closed");
  });

  it("all metrics missing → all targets fail", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
      { metric: "hash_chain_integrity_pct", operator: "gte", threshold: 99, window: "7d" },
    ]);

    const result = evaluateSla(policy, {}); // empty metrics
    expect(result.verdict).toBe("FAIL");
    expect(result.failedCount).toBe(2);
    expect(result.results.every((r) => !r.passed)).toBe(true);
  });
});

// =============================================================================
// All Threshold Operators
// =============================================================================

describe("SLA Engine: threshold operators", () => {
  it("lte operator", () => {
    const policy = createPolicy([
      { metric: "m", operator: "lte", threshold: 100, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: 99 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 100 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 101 }).verdict).toBe("FAIL");
  });

  it("gte operator", () => {
    const policy = createPolicy([
      { metric: "m", operator: "gte", threshold: 100, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: 101 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 100 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 99 }).verdict).toBe("FAIL");
  });

  it("lt operator (strictly less than)", () => {
    const policy = createPolicy([
      { metric: "m", operator: "lt", threshold: 100, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: 99 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 100 }).verdict).toBe("FAIL"); // Boundary fails
    expect(evaluateSla(policy, { m: 101 }).verdict).toBe("FAIL");
  });

  it("gt operator (strictly greater than)", () => {
    const policy = createPolicy([
      { metric: "m", operator: "gt", threshold: 100, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: 101 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 100 }).verdict).toBe("FAIL"); // Boundary fails
    expect(evaluateSla(policy, { m: 99 }).verdict).toBe("FAIL");
  });

  it("eq operator", () => {
    const policy = createPolicy([
      { metric: "m", operator: "eq", threshold: 100, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: 100 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 99 }).verdict).toBe("FAIL");
    expect(evaluateSla(policy, { m: 101 }).verdict).toBe("FAIL");
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("SLA Engine: edge cases", () => {
  it("zero threshold", () => {
    const policy = createPolicy([
      { metric: "m", operator: "gte", threshold: 0, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: 0 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 1 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: -1 }).verdict).toBe("FAIL");
  });

  it("negative metric values", () => {
    const policy = createPolicy([
      { metric: "m", operator: "lte", threshold: -10, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: -20 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: -10 }).verdict).toBe("PASS");
    expect(evaluateSla(policy, { m: 0 }).verdict).toBe("FAIL");
  });

  it("very large metric values", () => {
    const policy = createPolicy([
      { metric: "m", operator: "lte", threshold: Number.MAX_SAFE_INTEGER, window: "24h" },
    ]);

    expect(evaluateSla(policy, { m: 999999999 }).verdict).toBe("PASS");
  });

  it("custom metric names work", () => {
    const policy = createPolicy([
      { metric: "custom.my_metric", operator: "gte", threshold: 50, window: "24h" },
    ]);

    expect(evaluateSla(policy, { "custom.my_metric": 75 }).verdict).toBe("PASS");
  });

  it("result detail strings contain metric info", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
    ]);

    const passResult = evaluateSla(policy, { replay_time_ms: 200 });
    expect(passResult.results[0]!.detail).toContain("PASS");
    expect(passResult.results[0]!.detail).toContain("replay_time_ms");
    expect(passResult.results[0]!.detail).toContain("200");

    const failResult = evaluateSla(policy, { replay_time_ms: 600 });
    expect(failResult.results[0]!.detail).toContain("FAIL");
    expect(failResult.results[0]!.detail).toContain("replay_time_ms");
    expect(failResult.results[0]!.detail).toContain("600");
  });
});

// =============================================================================
// Multiple Policies
// =============================================================================

describe("SLA Engine: multiple policies", () => {
  it("evaluates multiple policies independently", () => {
    const production = createPolicy(
      [
        { metric: "replay_time_ms", operator: "lte", threshold: 100, window: "24h" },
        { metric: "hash_chain_integrity_pct", operator: "gte", threshold: 99.99, window: "30d" },
      ],
      { id: "production", name: "Production SLA" },
    );

    const staging = createPolicy(
      [
        { metric: "replay_time_ms", operator: "lte", threshold: 1000, window: "24h" },
      ],
      { id: "staging", name: "Staging SLA" },
    );

    const metrics: SlaMetrics = {
      replay_time_ms: 200,
      hash_chain_integrity_pct: 99.5,
    };

    const results = evaluateMultipleSla([production, staging], metrics);

    expect(results).toHaveLength(2);

    // Production fails (hash_chain_integrity below 99.99)
    expect(results[0]!.verdict).toBe("FAIL");
    expect(results[0]!.policy.id).toBe("production");

    // Staging passes (replay_time under 1000)
    expect(results[1]!.verdict).toBe("PASS");
    expect(results[1]!.policy.id).toBe("staging");
  });
});

// =============================================================================
// Determinism
// =============================================================================

describe("SLA Engine: determinism", () => {
  it("same inputs produce same output (except evaluatedAt)", () => {
    const policy = createPolicy([
      { metric: "replay_time_ms", operator: "lte", threshold: 500, window: "24h" },
      { metric: "hash_chain_integrity_pct", operator: "gte", threshold: 99, window: "7d" },
    ]);

    const metrics: SlaMetrics = {
      replay_time_ms: 200,
      hash_chain_integrity_pct: 100,
    };

    const result1 = evaluateSla(policy, metrics);
    const result2 = evaluateSla(policy, metrics);

    expect(result1.verdict).toBe(result2.verdict);
    expect(result1.passedCount).toBe(result2.passedCount);
    expect(result1.failedCount).toBe(result2.failedCount);
    expect(result1.results.length).toBe(result2.results.length);

    for (let i = 0; i < result1.results.length; i++) {
      expect(result1.results[i]!.passed).toBe(result2.results[i]!.passed);
      expect(result1.results[i]!.actualValue).toBe(result2.results[i]!.actualValue);
      expect(result1.results[i]!.detail).toBe(result2.results[i]!.detail);
    }
  });
});
