/**
 * Cross-Chain Invariant Tests
 *
 * Each invariant with passing and failing cases.
 */

import { describe, it, expect } from "vitest";
import {
  checkAssetConservation,
  checkNoDuplicateSettlement,
  checkEventOrdering,
  checkGovernanceConsistency,
  auditCrossChainInvariants,
} from "../src/cross-chain-invariants.js";
import type { InvariantEvent } from "../src/cross-chain-invariants.js";

// =============================================================================
// Helpers
// =============================================================================

function makeEvent(overrides: Partial<InvariantEvent> = {}): InvariantEvent {
  return {
    chainId: "eip155:1",
    eventId: `evt-${Math.random().toString(36).slice(2, 8)}`,
    eventType: "transfer",
    amount: "1000",
    symbol: "ETH",
    sequenceIndex: 0,
    timestamp: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// =============================================================================
// Asset Conservation
// =============================================================================

describe("checkAssetConservation", () => {
  it("passes when bridge outflows equal inflows", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "bridge_out", amount: "1000", symbol: "ETH", chainId: "eip155:1" }),
      makeEvent({ eventType: "bridge_in", amount: "1000", symbol: "ETH", chainId: "eip155:42161" }),
    ];

    const result = checkAssetConservation(events);
    expect(result.holds).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("fails when outflows exceed inflows", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "bridge_out", amount: "1000", symbol: "ETH" }),
      makeEvent({ eventType: "bridge_in", amount: "500", symbol: "ETH" }),
    ];

    const result = checkAssetConservation(events);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toContain("Asset conservation violation");
  });

  it("tracks per-symbol conservation independently", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "bridge_out", amount: "1000", symbol: "ETH" }),
      makeEvent({ eventType: "bridge_in", amount: "1000", symbol: "ETH" }),
      makeEvent({ eventType: "bridge_out", amount: "5000", symbol: "XRP" }),
      makeEvent({ eventType: "bridge_in", amount: "3000", symbol: "XRP" }),
    ];

    const result = checkAssetConservation(events);
    expect(result.holds).toBe(false);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0]).toContain("XRP");
  });

  it("ignores non-bridge events", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "transfer", amount: "9999" }),
    ];

    const result = checkAssetConservation(events);
    expect(result.holds).toBe(true);
  });

  it("handles invalid amounts gracefully", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "bridge_out", amount: "not-a-number" }),
    ];

    const result = checkAssetConservation(events);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toContain("Invalid amount");
  });
});

// =============================================================================
// No Duplicate Settlement
// =============================================================================

describe("checkNoDuplicateSettlement", () => {
  it("passes with unique settlements", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "settlement", eventId: "s1", linkedEventId: "evt-a" }),
      makeEvent({ eventType: "settlement", eventId: "s2", linkedEventId: "evt-b" }),
    ];

    const result = checkNoDuplicateSettlement(events);
    expect(result.holds).toBe(true);
  });

  it("fails when same event settled twice", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "settlement", eventId: "s1", linkedEventId: "evt-a" }),
      makeEvent({ eventType: "settlement", eventId: "s2", linkedEventId: "evt-a" }),
    ];

    const result = checkNoDuplicateSettlement(events);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toContain("Duplicate settlement");
  });

  it("flags settlement without linkedEventId", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "settlement", eventId: "s1" }),
    ];

    const result = checkNoDuplicateSettlement(events);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toContain("no linkedEventId");
  });

  it("ignores non-settlement events", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "transfer" }),
      makeEvent({ eventType: "bridge_out" }),
    ];

    const result = checkNoDuplicateSettlement(events);
    expect(result.holds).toBe(true);
  });
});

// =============================================================================
// Event Ordering
// =============================================================================

describe("checkEventOrdering", () => {
  it("passes with monotonically increasing sequences", () => {
    const events: InvariantEvent[] = [
      makeEvent({ chainId: "eip155:1", sequenceIndex: 0, timestamp: "2025-01-01T00:00:00Z" }),
      makeEvent({ chainId: "eip155:1", sequenceIndex: 1, timestamp: "2025-01-01T00:00:01Z" }),
      makeEvent({ chainId: "eip155:1", sequenceIndex: 2, timestamp: "2025-01-01T00:00:02Z" }),
    ];

    const result = checkEventOrdering(events);
    expect(result.holds).toBe(true);
  });

  it("fails on duplicate sequence index", () => {
    const events: InvariantEvent[] = [
      makeEvent({ chainId: "eip155:1", sequenceIndex: 0, eventId: "a" }),
      makeEvent({ chainId: "eip155:1", sequenceIndex: 0, eventId: "b" }),
    ];

    const result = checkEventOrdering(events);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toContain("non-increasing sequence");
  });

  it("fails on timestamp regression", () => {
    const events: InvariantEvent[] = [
      makeEvent({ chainId: "eip155:1", sequenceIndex: 0, timestamp: "2025-01-01T00:00:10Z" }),
      makeEvent({ chainId: "eip155:1", sequenceIndex: 1, timestamp: "2025-01-01T00:00:05Z" }),
    ];

    const result = checkEventOrdering(events);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toContain("timestamp regression");
  });

  it("allows equal timestamps (same-block events)", () => {
    const events: InvariantEvent[] = [
      makeEvent({ chainId: "eip155:1", sequenceIndex: 0, timestamp: "2025-01-01T00:00:00Z" }),
      makeEvent({ chainId: "eip155:1", sequenceIndex: 1, timestamp: "2025-01-01T00:00:00Z" }),
    ];

    const result = checkEventOrdering(events);
    expect(result.holds).toBe(true);
  });

  it("checks each chain independently", () => {
    const events: InvariantEvent[] = [
      makeEvent({ chainId: "eip155:1", sequenceIndex: 0, timestamp: "2025-01-01T00:00:00Z" }),
      makeEvent({ chainId: "eip155:1", sequenceIndex: 1, timestamp: "2025-01-01T00:00:01Z" }),
      makeEvent({ chainId: "eip155:42161", sequenceIndex: 0, timestamp: "2025-01-01T00:00:05Z" }),
      makeEvent({ chainId: "eip155:42161", sequenceIndex: 1, timestamp: "2025-01-01T00:00:06Z" }),
    ];

    const result = checkEventOrdering(events);
    expect(result.holds).toBe(true);
  });
});

// =============================================================================
// Governance Consistency
// =============================================================================

describe("checkGovernanceConsistency", () => {
  it("passes with valid governance sequence", () => {
    const events: InvariantEvent[] = [
      makeEvent({
        eventType: "governance_signer_added",
        eventId: "signer_added:rAddr1",
        sequenceIndex: 0,
      }),
      makeEvent({
        eventType: "governance_signer_added",
        eventId: "signer_added:rAddr2",
        sequenceIndex: 1,
      }),
    ];

    const result = checkGovernanceConsistency(events);
    expect(result.holds).toBe(true);
  });

  it("fails on duplicate signer addition", () => {
    const events: InvariantEvent[] = [
      makeEvent({
        eventType: "governance_signer_added",
        eventId: "signer_added:rAddr1",
        sequenceIndex: 0,
      }),
      makeEvent({
        eventType: "governance_signer_added",
        eventId: "signer_added:rAddr1",
        sequenceIndex: 1,
      }),
    ];

    const result = checkGovernanceConsistency(events);
    expect(result.holds).toBe(false);
    expect(result.violations[0]).toContain("Duplicate signer addition");
  });

  it("allows re-adding after removal", () => {
    const events: InvariantEvent[] = [
      makeEvent({
        eventType: "governance_signer_added",
        eventId: "signer_added:rAddr1",
        sequenceIndex: 0,
      }),
      makeEvent({
        eventType: "governance_signer_removed",
        eventId: "signer_removed:rAddr1",
        sequenceIndex: 1,
      }),
      makeEvent({
        eventType: "governance_signer_added",
        eventId: "signer_added:rAddr1",
        sequenceIndex: 2,
      }),
    ];

    const result = checkGovernanceConsistency(events);
    expect(result.holds).toBe(true);
  });

  it("passes when no governance events exist", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "transfer" }),
    ];

    const result = checkGovernanceConsistency(events);
    expect(result.holds).toBe(true);
  });

  it("detects version regression (duplicate sequence index)", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "governance_signer_added", eventId: "signer_added:rA", sequenceIndex: 3 }),
      makeEvent({ eventType: "governance_signer_added", eventId: "signer_added:rB", sequenceIndex: 3 }),
    ];

    const result = checkGovernanceConsistency(events);
    expect(result.holds).toBe(false);
    expect(result.violations.some((v) => v.includes("regression"))).toBe(true);
  });
});

// =============================================================================
// Combined Audit
// =============================================================================

describe("auditCrossChainInvariants", () => {
  it("all invariants passing → PASS verdict", () => {
    const events: InvariantEvent[] = [
      makeEvent({ chainId: "eip155:1", sequenceIndex: 0, timestamp: "2025-01-01T00:00:00Z" }),
      makeEvent({ chainId: "eip155:1", sequenceIndex: 1, timestamp: "2025-01-01T00:00:01Z" }),
      makeEvent({ chainId: "eip155:42161", eventType: "bridge_out", amount: "500", symbol: "ETH", sequenceIndex: 0, timestamp: "2025-01-01T00:00:00Z" }),
      makeEvent({ chainId: "eip155:42161", eventType: "bridge_in", amount: "500", symbol: "ETH", sequenceIndex: 1, timestamp: "2025-01-01T00:00:01Z" }),
    ];

    const result = auditCrossChainInvariants(events);

    expect(result.verdict).toBe("PASS");
    expect(result.totalViolations).toBe(0);
    expect(result.checks.length).toBe(4);
    expect(result.checks.every((c) => c.holds)).toBe(true);
  });

  it("any invariant failing → FAIL verdict", () => {
    const events: InvariantEvent[] = [
      makeEvent({ eventType: "bridge_out", amount: "1000", symbol: "ETH" }),
      makeEvent({ eventType: "bridge_in", amount: "500", symbol: "ETH" }),
    ];

    const result = auditCrossChainInvariants(events);

    expect(result.verdict).toBe("FAIL");
    expect(result.totalViolations).toBeGreaterThan(0);
  });

  it("returns all 4 invariant checks", () => {
    const result = auditCrossChainInvariants([]);

    expect(result.checks.length).toBe(4);
    expect(result.checks.map((c) => c.invariant)).toEqual([
      "asset_conservation",
      "no_duplicate_settlement",
      "event_ordering",
      "governance_consistency",
    ]);
  });
});
