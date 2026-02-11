/**
 * Ordering Invariants Parity Tests
 *
 * Tests behavioral equivalence for invariants:
 * - C.1 ordering.total
 * - C.2 ordering.deterministic
 * - C.3 ordering.monotonic
 * - C.4 ordering.non_semantic
 *
 * These tests prove that the registry system produces identical
 * structural judgments to the legacy system for ordering invariants.
 */

import { describe, it, expect, beforeEach } from "vitest";

import {
  createRegistrarPair,
  createRootState,
  createChildState,
  createTransition,
  expectRegistrationParity,
  seedState,
} from "./parity.helpers";

import type { StructuralRegistrar } from "../../src/structural-registrar";
import type { RegistryDrivenRegistrar } from "../../src/registry/index";

describe("Ordering Invariants Parity", () => {
  let legacy: StructuralRegistrar;
  let registry: RegistryDrivenRegistrar;

  beforeEach(() => {
    const pair = createRegistrarPair();
    legacy = pair.legacy;
    registry = pair.registry;
  });

  // ===========================================================================
  // C.1 ordering.total
  // ===========================================================================

  describe("ordering.total", () => {
    it("all accepted states receive an order index", () => {
      const ids = ["Total1", "Total2", "Total3"];
      const legacyIndices: number[] = [];
      const registryIndices: number[] = [];

      for (const id of ids) {
        const state = createRootState(id);
        const transition = createTransition(null, state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `state ${id}`
        );

        expect(result.legacy.kind).toBe("accepted");

        if (result.legacy.kind === "accepted") {
          legacyIndices.push(result.legacy.orderIndex);
        }
        if (result.registry.kind === "accepted") {
          registryIndices.push(result.registry.orderIndex);
        }
      }

      // All indices should be defined
      expect(legacyIndices.length).toBe(ids.length);
      expect(registryIndices.length).toBe(ids.length);
      expect(registryIndices).toEqual(legacyIndices);
    });

    it("order indices start at 0", () => {
      const state = createRootState("First");
      const transition = createTransition(null, state);

      const result = expectRegistrationParity(
        legacy,
        registry,
        transition,
        "first state"
      );

      expect(result.legacy.kind).toBe("accepted");
      if (result.legacy.kind === "accepted") {
        expect(result.legacy.orderIndex).toBe(0);
      }
    });
  });

  // ===========================================================================
  // C.2 ordering.deterministic
  // ===========================================================================

  describe("ordering.deterministic", () => {
    it("same inputs produce same order across registrar instances", () => {
      const ids = ["DetA", "DetB", "DetC", "DetD"];

      // First run
      const firstResults: Array<{ id: string; index: number }> = [];
      for (const id of ids) {
        const state = createRootState(id);
        const transition = createTransition(null, state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `first run ${id}`
        );

        if (result.legacy.kind === "accepted") {
          firstResults.push({ id, index: result.legacy.orderIndex });
        }
      }

      // Second run with fresh registrars
      const freshPair = createRegistrarPair();
      const secondResults: Array<{ id: string; index: number }> = [];

      for (const id of ids) {
        const state = createRootState(id);
        const transition = createTransition(null, state);

        const legacyResult = freshPair.legacy.register(transition);
        const registryResult = freshPair.registry.register(transition);

        // Both systems should match
        expect(registryResult.kind).toBe(legacyResult.kind);

        if (legacyResult.kind === "accepted") {
          secondResults.push({ id, index: legacyResult.orderIndex });
        }
      }

      // Results should be identical
      expect(secondResults).toEqual(firstResults);
    });

    it("determinism holds for sequential transitions", () => {
      // Root + sequence of transitions
      const root = createRootState("DetSeq", { version: 1 });
      seedState(legacy, registry, root, null);

      const versions = [2, 3, 4, 5];
      const legacyIndices: number[] = [];
      const registryIndices: number[] = [];

      for (const version of versions) {
        const state = createChildState("DetSeq", { version });
        const transition = createTransition("DetSeq", state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `version ${version}`
        );

        if (result.legacy.kind === "accepted") {
          legacyIndices.push(result.legacy.orderIndex);
        }
        if (result.registry.kind === "accepted") {
          registryIndices.push(result.registry.orderIndex);
        }
      }

      expect(registryIndices).toEqual(legacyIndices);
    });
  });

  // ===========================================================================
  // C.3 ordering.monotonic
  // ===========================================================================

  describe("ordering.monotonic", () => {
    it("order indices increase monotonically", () => {
      const count = 10;
      const indices: number[] = [];

      for (let i = 0; i < count; i++) {
        const state = createRootState(`Mono${i}`);
        const transition = createTransition(null, state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `state ${i}`
        );

        expect(result.legacy.kind).toBe("accepted");
        if (result.legacy.kind === "accepted") {
          indices.push(result.legacy.orderIndex);
        }
      }

      // Verify strict monotonicity
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i]).toBeGreaterThan(indices[i - 1]!);
      }
    });

    it("order indices increment by 1", () => {
      const count = 5;
      const indices: number[] = [];

      for (let i = 0; i < count; i++) {
        const state = createRootState(`Inc${i}`);
        const transition = createTransition(null, state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `state ${i}`
        );

        if (result.legacy.kind === "accepted") {
          indices.push(result.legacy.orderIndex);
        }
      }

      // Verify exact sequence: 0, 1, 2, 3, 4
      expect(indices).toEqual([0, 1, 2, 3, 4]);
    });

    it("rejected transitions do not consume order indices", () => {
      // Register first state
      const state1 = createRootState("First");
      const result1 = expectRegistrationParity(
        legacy,
        registry,
        createTransition(null, state1),
        "first state"
      );

      // Attempt invalid transition (should be rejected)
      const orphan = createChildState("Orphan");
      const rejectedResult = expectRegistrationParity(
        legacy,
        registry,
        createTransition("MissingParent", orphan),
        "rejected transition"
      );

      expect(rejectedResult.legacy.kind).not.toBe("accepted");

      // Register another valid state
      const state2 = createRootState("Second");
      const result2 = expectRegistrationParity(
        legacy,
        registry,
        createTransition(null, state2),
        "second state"
      );

      // Order indices should be consecutive (0, 1) despite rejected transition
      if (result1.legacy.kind === "accepted" && result2.legacy.kind === "accepted") {
        expect(result1.legacy.orderIndex).toBe(0);
        expect(result2.legacy.orderIndex).toBe(1);
      }
    });
  });

  // ===========================================================================
  // C.4 ordering.non_semantic
  // ===========================================================================

  describe("ordering.non_semantic", () => {
    it("order based on structure, not content", () => {
      // States with different data content
      const state1 = createRootState("NonSem1");
      (state1 as { data: unknown }).data = { content: "ZZZZ", priority: 999 };

      const state2 = createRootState("NonSem2");
      (state2 as { data: unknown }).data = { content: "AAAA", priority: 1 };

      const result1 = expectRegistrationParity(
        legacy,
        registry,
        createTransition(null, state1),
        "state with ZZZZ"
      );

      const result2 = expectRegistrationParity(
        legacy,
        registry,
        createTransition(null, state2),
        "state with AAAA"
      );

      // First registered gets lower index, regardless of content
      if (result1.legacy.kind === "accepted" && result2.legacy.kind === "accepted") {
        expect(result1.legacy.orderIndex).toBeLessThan(result2.legacy.orderIndex);
      }
    });

    it("order independent of data field values", () => {
      // Reverse alphabetical order of data content
      const statesWithData = [
        { id: "DataZ", data: { text: "Zebra" } },
        { id: "DataY", data: { text: "Yak" } },
        { id: "DataX", data: { text: "X-ray" } },
      ];

      const indices: number[] = [];

      for (const { id, data } of statesWithData) {
        const state = createRootState(id);
        (state as { data: unknown }).data = data;

        const result = expectRegistrationParity(
          legacy,
          registry,
          createTransition(null, state),
          `state ${id}`
        );

        if (result.legacy.kind === "accepted") {
          indices.push(result.legacy.orderIndex);
        }
      }

      // Order should be by registration sequence (0, 1, 2)
      expect(indices).toEqual([0, 1, 2]);
    });

    it("order independent of structure complexity", () => {
      // Simple structure
      const simple = createRootState("Simple", {});

      // Complex structure
      const complex = createRootState("Complex", {
        nested: { deep: { value: true } },
        array: [1, 2, 3, 4, 5],
        metadata: { created: "now", tags: ["a", "b", "c"] },
      });

      const result1 = expectRegistrationParity(
        legacy,
        registry,
        createTransition(null, simple),
        "simple structure"
      );

      const result2 = expectRegistrationParity(
        legacy,
        registry,
        createTransition(null, complex),
        "complex structure"
      );

      // First registered gets lower index
      if (result1.legacy.kind === "accepted" && result2.legacy.kind === "accepted") {
        expect(result1.legacy.orderIndex).toBeLessThan(result2.legacy.orderIndex);
      }
    });
  });

  // ===========================================================================
  // Combined Ordering Scenarios
  // ===========================================================================

  describe("Combined ordering scenarios", () => {
    it("large sequence maintains parity", () => {
      const count = 50;
      const legacyIndices: number[] = [];
      const registryIndices: number[] = [];

      for (let i = 0; i < count; i++) {
        const state = createRootState(`Large${i}`);
        const transition = createTransition(null, state);

        const result = expectRegistrationParity(
          legacy,
          registry,
          transition,
          `state ${i}`
        );

        if (result.legacy.kind === "accepted") {
          legacyIndices.push(result.legacy.orderIndex);
        }
        if (result.registry.kind === "accepted") {
          registryIndices.push(result.registry.orderIndex);
        }
      }

      // Complete parity
      expect(registryIndices).toEqual(legacyIndices);
      expect(legacyIndices.length).toBe(count);
    });

    it("mixed transitions maintain order parity", () => {
      // Mix of roots and child transitions
      const root1 = createRootState("Root1");
      seedState(legacy, registry, root1, null);

      const root2 = createRootState("Root2");
      seedState(legacy, registry, root2, null);

      // Children of root1
      const child1 = createChildState("Root1", { version: 2 });
      const result1 = expectRegistrationParity(
        legacy,
        registry,
        createTransition("Root1", child1),
        "child of Root1"
      );

      // Another root
      const root3 = createRootState("Root3");
      const result2 = expectRegistrationParity(
        legacy,
        registry,
        createTransition(null, root3),
        "Root3"
      );

      // Child of root2
      const child2 = createChildState("Root2", { version: 2 });
      const result3 = expectRegistrationParity(
        legacy,
        registry,
        createTransition("Root2", child2),
        "child of Root2"
      );

      // All accepted in order
      expect(result1.legacy.kind).toBe("accepted");
      expect(result2.legacy.kind).toBe("accepted");
      expect(result3.legacy.kind).toBe("accepted");
    });
  });
});
