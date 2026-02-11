/**
 * Lineage Invariants Parity Tests
 *
 * Tests behavioral equivalence for invariants:
 * - B.1 state.lineage.explicit
 * - B.2 state.lineage.parent_exists
 * - B.3 state.lineage.single_parent
 * - B.4 state.lineage.continuous
 *
 * These tests prove that the registry system produces identical
 * structural judgments to the legacy system for lineage invariants.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  createRegistrarPair,
  createRootState,
  createChildState,
  createTransition,
  expectRegistrationParity,
  expectValidationParity,
  expectLineageParity,
  seedState,
} from "./parity.helpers";

import type { StructuralRegistrar } from "../../src/structural-registrar";
import type { RegistryDrivenRegistrar } from "../../src/registry/index";

describe("Lineage Invariants Parity", () => {
  let legacy: StructuralRegistrar;
  let registry: RegistryDrivenRegistrar;

  beforeEach(() => {
    const pair = createRegistrarPair();
    legacy = pair.legacy;
    registry = pair.registry;
  });

  // ===========================================================================
  // B.1 state.lineage.explicit
  // ===========================================================================

  describe("state.lineage.explicit", () => {
    it("accepts root state with explicit root flag", () => {
      const state = createRootState("RootState");
      const transition = createTransition(null, state);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "root state with isRoot flag"
      );

      expect(result.legacy.kind).toBe("accepted");
    });

    it("rejects non-root state without parent", () => {
      // State without isRoot flag and null parent
      const state = createChildState("OrphanState");
      const transition = createTransition(null, state);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "non-root without parent"
      );

      expect(result.legacy.kind).toBe("rejected");
      if (result.legacy.kind === "rejected") {
        expect(result.legacy.invariantIds).toContain("state.lineage.explicit");
      }
    });

    it("accepts child state with explicit parent", () => {
      // Seed parent
      const parent = createRootState("Parent");
      seedState(legacy, registry, parent, null);

      // Child with explicit parent (and same ID for identity preservation)
      const child = createChildState("Parent", { version: 2 });
      const transition = createTransition("Parent", child);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "child with explicit parent"
      );

      expect(result.legacy.kind).toBe("accepted");
    });
  });

  // ===========================================================================
  // B.2 state.lineage.parent_exists
  // ===========================================================================

  describe("state.lineage.parent_exists", () => {
    it("accepts transition with existing parent", () => {
      // Seed parent
      const parent = createRootState("ExistingParent");
      seedState(legacy, registry, parent, null);

      // Child referencing existing parent
      const child = createChildState("ExistingParent", { version: 2 });
      const transition = createTransition("ExistingParent", child);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "existing parent"
      );

      expect(result.legacy.kind).toBe("accepted");
    });

    it("halts on transition with non-existent parent", () => {
      // No parent seeded - transition references missing parent
      // Note: Both parent_exists (reject) and continuous (halt) fire
      // Since continuous has halt mode, the result is halted
      const child = createChildState("Orphan");
      const transition = createTransition("MissingParent", child);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "non-existent parent"
      );

      // Result is halted because state.lineage.continuous has failure_mode: halt
      expect(result.legacy.kind).toBe("halted");
      if (result.legacy.kind === "halted") {
        expect(result.legacy.invariantIds).toContain("state.lineage.parent_exists");
        expect(result.legacy.invariantIds).toContain("state.lineage.continuous");
      }
    });

    it("accepts null parent for root state", () => {
      const root = createRootState("RootWithNullParent");
      const transition = createTransition(null, root);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "null parent for root"
      );

      expect(result.legacy.kind).toBe("accepted");
    });
  });

  // ===========================================================================
  // B.3 state.lineage.single_parent
  // ===========================================================================

  describe("state.lineage.single_parent", () => {
    it("accepts single parent reference", () => {
      // Seed parent
      const parent = createRootState("SingleParent");
      seedState(legacy, registry, parent, null);

      // Child with single parent
      const child = createChildState("SingleParent", { version: 2 });
      const transition = createTransition("SingleParent", child);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "single parent reference"
      );

      expect(result.legacy.kind).toBe("accepted");
    });

    it("rejects multi-parent transition (type system bypass)", () => {
      // Seed two potential parents
      const parent1 = createRootState("Parent1");
      const parent2 = createRootState("Parent2");
      seedState(legacy, registry, parent1, null);
      seedState(legacy, registry, parent2, null);

      // Attempt multi-parent (bypass type system with cast)
      const child = createChildState("MultiParentChild");
      const transition = createTransition(
        ["Parent1", "Parent2"] as unknown as string,
        child
      );

      // Both systems should handle this consistently
      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "multi-parent transition"
      );

      // Should be rejected (exact invariants may vary)
      expect(result.legacy.kind).not.toBe("accepted");
    });

    it("accepts null parent (no parent, not multi-parent)", () => {
      const root = createRootState("NullParentRoot");
      const transition = createTransition(null, root);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "null parent"
      );

      expect(result.legacy.kind).toBe("accepted");
    });
  });

  // ===========================================================================
  // B.4 state.lineage.continuous
  // ===========================================================================

  describe("state.lineage.continuous", () => {
    it("maintains continuous lineage chain", () => {
      // Build a chain: Root -> v2 -> v3
      const root = createRootState("Chain", { version: 1 });
      seedState(legacy, registry, root, null);

      const v2 = createChildState("Chain", { version: 2 });
      seedState(legacy, registry, v2, "Chain");

      const v3 = createChildState("Chain", { version: 3 });
      const transition = createTransition("Chain", v3);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "continuous chain"
      );

      expect(result.legacy.kind).toBe("accepted");

      // Verify lineage is traceable
      expectLineageParity(legacy, registry, "Chain", "chain lineage");
    });

    it("halts on broken lineage (missing parent in chain)", () => {
      // Only seed root, skip intermediate
      const root = createRootState("BrokenChain");
      seedState(legacy, registry, root, null);

      // Attempt to reference non-existent intermediate parent
      const leaf = createChildState("LeafState");
      const transition = createTransition("MissingIntermediate", leaf);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "broken lineage"
      );

      // Should be halted (state.lineage.continuous has failure_mode: halt)
      expect(result.legacy.kind).toBe("halted");
    });

    it("lineage traces match for deep chains", () => {
      const depth = 5;

      // Build chain
      const root = createRootState("Deep", { version: 1 });
      seedState(legacy, registry, root, null);

      for (let i = 2; i <= depth; i++) {
        const state = createChildState("Deep", { version: i });
        seedState(legacy, registry, state, "Deep");
      }

      // Verify lineage parity
      const lineage = expectLineageParity(
        legacy,
        registry,
        "Deep",
        "deep chain lineage"
      );

      expect(lineage.legacy.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Combined Lineage Scenarios
  // ===========================================================================

  describe("Combined lineage scenarios", () => {
    it("multiple independent lineages", () => {
      // Create three independent root states
      const roots = ["LineageA", "LineageB", "LineageC"];

      for (const id of roots) {
        const root = createRootState(id);
        const transition = createTransition(null, root);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `root ${id}`
        );

        expect(result.legacy.kind).toBe("accepted");
      }

      // Extend each lineage
      for (const id of roots) {
        const child = createChildState(id, { version: 2 });
        const transition = createTransition(id, child);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `extend ${id}`
        );

        expect(result.legacy.kind).toBe("accepted");
      }
    });

    it("lineage returns empty for unregistered state", () => {
      const lineage = expectLineageParity(
        legacy,
        registry,
        "NonExistent",
        "unregistered state lineage"
      );

      expect(lineage.legacy).toEqual([]);
    });
  });
});
