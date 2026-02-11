/**
 * Tests for GovernanceStore.
 *
 * Verifies event-sourced governance state management:
 * - Add/remove signers
 * - Change quorum
 * - Replay determinism
 * - Validation constraints
 */

import { describe, it, expect } from "vitest";
import { GovernanceStore } from "../../src/governance/governance-store.js";

describe("GovernanceStore", () => {
  describe("addSigner", () => {
    it("adds a signer to the policy", () => {
      const store = new GovernanceStore();
      const event = store.addSigner("rSigner1", "Signer One");

      expect(event.type).toBe("signer_added");
      expect(store.signerCount).toBe(1);

      const policy = store.getCurrentPolicy();
      expect(policy.signers.length).toBe(1);
      expect(policy.signers[0]!.address).toBe("rSigner1");
      expect(policy.signers[0]!.label).toBe("Signer One");
      expect(policy.signers[0]!.weight).toBe(1);
    });

    it("adds multiple signers", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.addSigner("rSigner3", "Three");

      expect(store.signerCount).toBe(3);
    });

    it("throws on duplicate signer", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");

      expect(() => store.addSigner("rSigner1", "Duplicate")).toThrow(
        "Signer already exists",
      );
    });

    it("throws on invalid weight", () => {
      const store = new GovernanceStore();

      expect(() => store.addSigner("rSigner1", "One", 0)).toThrow(
        "Weight must be >= 1",
      );
    });

    it("supports custom weight", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "Admin", 3);

      const policy = store.getCurrentPolicy();
      expect(policy.signers[0]!.weight).toBe(3);
    });
  });

  describe("removeSigner", () => {
    it("removes a signer", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.removeSigner("rSigner1");

      expect(store.signerCount).toBe(1);
      const policy = store.getCurrentPolicy();
      expect(policy.signers[0]!.address).toBe("rSigner2");
    });

    it("throws when signer not found", () => {
      const store = new GovernanceStore();

      expect(() => store.removeSigner("rNonExistent")).toThrow(
        "Signer not found",
      );
    });

    it("throws when removal would violate quorum", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.changeQuorum(2);

      // Removing either would leave weight=1 < quorum=2
      expect(() => store.removeSigner("rSigner1")).toThrow(
        "remaining weight",
      );
    });
  });

  describe("changeQuorum", () => {
    it("changes quorum threshold", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.changeQuorum(2);

      const policy = store.getCurrentPolicy();
      expect(policy.quorum).toBe(2);
    });

    it("throws when quorum < 1", () => {
      const store = new GovernanceStore();

      expect(() => store.changeQuorum(0)).toThrow("Quorum must be >= 1");
    });

    it("throws when quorum exceeds total weight", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");

      expect(() => store.changeQuorum(3)).toThrow("cannot exceed total signer weight");
    });

    it("emits event with previous and new quorum", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      const event = store.changeQuorum(2);

      expect(event.type).toBe("quorum_changed");
      if (event.type === "quorum_changed") {
        expect(event.previousQuorum).toBe(1);
        expect(event.newQuorum).toBe(2);
      }
    });
  });

  describe("checkQuorum", () => {
    it("returns met=true when quorum is satisfied", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.changeQuorum(2);

      const result = store.checkQuorum(["rSigner1", "rSigner2"]);
      expect(result.met).toBe(true);
      expect(result.totalWeight).toBe(2);
    });

    it("returns met=false when quorum is not satisfied", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.changeQuorum(2);

      const result = store.checkQuorum(["rSigner1"]);
      expect(result.met).toBe(false);
      expect(result.totalWeight).toBe(1);
    });

    it("ignores non-policy addresses", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");

      const result = store.checkQuorum(["rSigner1", "rNonMember"]);
      expect(result.totalWeight).toBe(1);
      expect(result.signerAddresses).toEqual(["rSigner1"]);
    });

    it("reports missing signers", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.addSigner("rSigner3", "Three");

      const result = store.checkQuorum(["rSigner1"]);
      expect(result.missingAddresses).toContain("rSigner2");
      expect(result.missingAddresses).toContain("rSigner3");
    });
  });

  describe("replay determinism", () => {
    it("replaying same events produces identical policy", () => {
      // Build store 1
      const store1 = new GovernanceStore();
      store1.addSigner("rSigner1", "One");
      store1.addSigner("rSigner2", "Two");
      store1.changeQuorum(2);

      const events = store1.getEventHistory();

      // Replay on store 2
      const store2 = new GovernanceStore();
      store2.replayFrom(events);

      const policy1 = store1.getCurrentPolicy();
      const policy2 = store2.getCurrentPolicy();

      expect(policy1.id).toBe(policy2.id);
      expect(policy1.version).toBe(policy2.version);
      expect(policy1.quorum).toBe(policy2.quorum);
      expect(policy1.signers.length).toBe(policy2.signers.length);
      expect(policy1.signers[0]!.address).toBe(policy2.signers[0]!.address);
    });

    it("replaying events resets state first", () => {
      const store = new GovernanceStore();
      store.addSigner("rOld", "Old Signer");

      // Replay with different events
      store.replayFrom([
        {
          type: "signer_added",
          address: "rNew",
          label: "New Signer",
          weight: 1,
          timestamp: "2025-01-01T00:00:00Z",
        },
      ]);

      expect(store.signerCount).toBe(1);
      const policy = store.getCurrentPolicy();
      expect(policy.signers[0]!.address).toBe("rNew");
    });
  });

  describe("version tracking", () => {
    it("increments version on each change", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      expect(store.getCurrentPolicy().version).toBe(1);

      store.addSigner("rSigner2", "Two");
      expect(store.getCurrentPolicy().version).toBe(2);

      store.addSigner("rSigner3", "Three");
      expect(store.getCurrentPolicy().version).toBe(3);

      store.changeQuorum(2);
      expect(store.getCurrentPolicy().version).toBe(4);

      store.removeSigner("rSigner3");
      expect(store.getCurrentPolicy().version).toBe(5);
    });
  });

  describe("event history", () => {
    it("records all events in order", () => {
      const store = new GovernanceStore();
      store.addSigner("rSigner1", "One");
      store.addSigner("rSigner2", "Two");
      store.changeQuorum(2);

      const history = store.getEventHistory();
      expect(history.length).toBe(3);
      expect(history[0]!.type).toBe("signer_added");
      expect(history[1]!.type).toBe("signer_added");
      expect(history[2]!.type).toBe("quorum_changed");
    });
  });

  describe("policy ID", () => {
    it("is deterministic for same state", () => {
      const store1 = new GovernanceStore();
      store1.addSigner("rA", "A");
      store1.addSigner("rB", "B");

      const store2 = new GovernanceStore();
      store2.addSigner("rA", "A");
      store2.addSigner("rB", "B");

      expect(store1.getCurrentPolicy().id).toBe(store2.getCurrentPolicy().id);
    });

    it("changes when signers change", () => {
      const store = new GovernanceStore();
      store.addSigner("rA", "A");
      const id1 = store.getCurrentPolicy().id;

      store.addSigner("rB", "B");
      const id2 = store.getCurrentPolicy().id;

      expect(id1).not.toBe(id2);
    });
  });
});
