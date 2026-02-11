/**
 * Identity Invariants Parity Tests
 *
 * Tests behavioral equivalence for invariants:
 * - A.1 state.identity.immutable
 * - A.2 state.identity.explicit
 * - A.3 state.identity.unique
 *
 * These tests prove that the registry system produces identical
 * structural judgments to the legacy system for identity invariants.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  createRegistrarPair,
  createRootState,
  createChildState,
  createTransition,
  expectRegistrationParity,
  expectValidationParity,
  seedState,
} from "./parity.helpers";

import type { StructuralRegistrar } from "../../src/structural-registrar";
import type { RegistryDrivenRegistrar } from "../../src/registry/index";

describe("Identity Invariants Parity", () => {
  let legacy: StructuralRegistrar;
  let registry: RegistryDrivenRegistrar;

  beforeEach(() => {
    const pair = createRegistrarPair();
    legacy = pair.legacy;
    registry = pair.registry;
  });

  // ===========================================================================
  // A.2 state.identity.explicit
  // ===========================================================================

  describe("state.identity.explicit", () => {
    it("accepts state with explicit non-empty ID", () => {
      const state = createRootState("ValidID");
      const transition = createTransition(null, state);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "explicit non-empty ID"
      );

      expect(result.legacy.kind).toBe("accepted");
    });

    it("rejects state with empty ID", () => {
      const state = createRootState("");
      const transition = createTransition(null, state);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "empty ID"
      );

      expect(result.legacy.kind).toBe("rejected");
      if (result.legacy.kind === "rejected") {
        expect(result.legacy.invariantIds).toContain("state.identity.explicit");
      }
    });

    it("validates state with explicit ID", () => {
      const state = createRootState("ValidState");

      expectValidationParity(
        legacy,
        registry,
        state,
        "validate explicit ID"
      );
    });

    it("validates state with empty ID as invalid", () => {
      const state = createRootState("");

      const result = expectValidationParity(
        legacy,
        registry,
        state,
        "validate empty ID"
      );

      expect(result.legacy.valid).toBe(false);
    });
  });

  // ===========================================================================
  // A.1 state.identity.immutable
  // ===========================================================================

  describe("state.identity.immutable", () => {
    it("accepts transition preserving identity", () => {
      // Seed initial state
      const initialState = createRootState("S1", { version: 1 });
      seedState(legacy, registry, initialState, null);

      // Transition with same ID (identity preserved)
      const nextState = createChildState("S1", { version: 2 });
      const transition = createTransition("S1", nextState);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "identity preserved"
      );

      expect(result.legacy.kind).toBe("accepted");
    });

    it("rejects transition mutating identity", () => {
      // Seed initial state
      const initialState = createRootState("S1", { version: 1 });
      seedState(legacy, registry, initialState, null);

      // Transition with different ID (identity mutation)
      const mutatedState = createChildState("S2", { version: 2 });
      const transition = createTransition("S1", mutatedState);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "identity mutation"
      );

      expect(result.legacy.kind).toBe("rejected");
      if (result.legacy.kind === "rejected") {
        expect(result.legacy.invariantIds).toContain("state.identity.immutable");
      }
    });

    it("validates transition preserving identity", () => {
      // Seed parent state
      const parentState = createRootState("Parent");
      seedState(legacy, registry, parentState, null);

      // Transition preserving identity
      const childState = createChildState("Parent", { version: 2 });
      const transition = createTransition("Parent", childState);

      const result = expectValidationParity(
        legacy,
        registry,
        transition,
        "validate identity preserved"
      );

      expect(result.legacy.valid).toBe(true);
    });

    it("validates transition mutating identity as invalid", () => {
      // Seed parent state
      const parentState = createRootState("Parent");
      seedState(legacy, registry, parentState, null);

      // Transition mutating identity
      const mutatedState = createChildState("DifferentID");
      const transition = createTransition("Parent", mutatedState);

      const result = expectValidationParity(
        legacy,
        registry,
        transition,
        "validate identity mutation"
      );

      expect(result.legacy.valid).toBe(false);
      expect(result.legacy.invariantIds).toContain("state.identity.immutable");
    });
  });

  // ===========================================================================
  // A.3 state.identity.unique
  // ===========================================================================

  describe("state.identity.unique", () => {
    it("accepts unique identities", () => {
      // Register first state
      const state1 = createRootState("UniqueA");
      seedState(legacy, registry, state1, null);

      // Register second state with different ID
      const state2 = createRootState("UniqueB");
      const transition = createTransition(null, state2);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "unique identities"
      );

      expect(result.legacy.kind).toBe("accepted");
    });

    it("halts on duplicate root identity registration", () => {
      // Register initial root state
      const state1 = createRootState("Duplicate");
      seedState(legacy, registry, state1, null);

      // Attempt to register another root with same ID
      const state2 = createRootState("Duplicate");
      const transition = createTransition(null, state2);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "duplicate root identity"
      );

      // Should be halted (state.identity.unique has failure_mode: halt)
      expect(result.legacy.kind).toBe("halted");
      if (result.legacy.kind === "halted") {
        expect(result.legacy.invariantIds).toContain("state.identity.unique");
      }
    });

    it("accepts transition on existing state (same ID, not duplicate)", () => {
      // Register initial state
      const state1 = createRootState("Existing", { version: 1 });
      seedState(legacy, registry, state1, null);

      // Transition on existing state (same ID is expected)
      const state2 = createChildState("Existing", { version: 2 });
      const transition = createTransition("Existing", state2);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "transition on existing state"
      );

      expect(result.legacy.kind).toBe("accepted");
    });
  });

  // ===========================================================================
  // Combined Identity Scenarios
  // ===========================================================================

  describe("Combined identity scenarios", () => {
    it("multiple independent root states", () => {
      const ids = ["Alpha", "Beta", "Gamma", "Delta"];

      for (const id of ids) {
        const state = createRootState(id);
        const transition = createTransition(null, state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `root state ${id}`
        );

        expect(result.legacy.kind).toBe("accepted");
      }
    });

    it("sequence of transitions on same identity", () => {
      // Initial root
      const root = createRootState("Entity", { version: 1 });
      seedState(legacy, registry, root, null);

      // Multiple transitions preserving identity
      for (let version = 2; version <= 5; version++) {
        const state = createChildState("Entity", { version });
        const transition = createTransition("Entity", state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `transition to version ${version}`
        );

        expect(result.legacy.kind).toBe("accepted");
      }
    });
  });
});
