/**
 * Tests for governance type guards.
 */

import { describe, it, expect } from "vitest";
import {
  isSignerAddedEvent,
  isSignerRemovedEvent,
  isQuorumChangedEvent,
  isPolicyRotatedEvent,
} from "../../src/governance/types.js";
import type { GovernanceChangeEvent } from "../../src/governance/types.js";

describe("Governance type guards", () => {
  const signerAdded: GovernanceChangeEvent = {
    type: "signer_added",
    address: "rTest1",
    label: "Signer 1",
    weight: 1,
    timestamp: "2025-01-01T00:00:00Z",
  };

  const signerRemoved: GovernanceChangeEvent = {
    type: "signer_removed",
    address: "rTest1",
    timestamp: "2025-01-01T00:00:00Z",
  };

  const quorumChanged: GovernanceChangeEvent = {
    type: "quorum_changed",
    previousQuorum: 1,
    newQuorum: 2,
    timestamp: "2025-01-01T00:00:00Z",
  };

  const policyRotated: GovernanceChangeEvent = {
    type: "policy_rotated",
    reason: "Scheduled rotation",
    timestamp: "2025-01-01T00:00:00Z",
  };

  it("isSignerAddedEvent identifies correctly", () => {
    expect(isSignerAddedEvent(signerAdded)).toBe(true);
    expect(isSignerAddedEvent(signerRemoved)).toBe(false);
    expect(isSignerAddedEvent(quorumChanged)).toBe(false);
    expect(isSignerAddedEvent(policyRotated)).toBe(false);
  });

  it("isSignerRemovedEvent identifies correctly", () => {
    expect(isSignerRemovedEvent(signerRemoved)).toBe(true);
    expect(isSignerRemovedEvent(signerAdded)).toBe(false);
  });

  it("isQuorumChangedEvent identifies correctly", () => {
    expect(isQuorumChangedEvent(quorumChanged)).toBe(true);
    expect(isQuorumChangedEvent(signerAdded)).toBe(false);
  });

  it("isPolicyRotatedEvent identifies correctly", () => {
    expect(isPolicyRotatedEvent(policyRotated)).toBe(true);
    expect(isPolicyRotatedEvent(signerAdded)).toBe(false);
  });

  it("all events have timestamp", () => {
    const events = [signerAdded, signerRemoved, quorumChanged, policyRotated];
    for (const event of events) {
      expect(event.timestamp).toBeDefined();
      expect(typeof event.timestamp).toBe("string");
    }
  });
});
