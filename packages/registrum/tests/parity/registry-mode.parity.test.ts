/**
 * Registry Mode Parity Tests
 *
 * Tests that StructuralRegistrar in "registry" mode produces identical
 * results to "legacy" mode.
 *
 * This validates C.5 (Registry System Cut-In Behind Flag):
 * - Both modes use the same StructuralRegistrar class
 * - Behavior is identical regardless of mode
 * - No silent divergence introduced by the mode flag
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

import {
  StructuralRegistrar,
  type RegistrarMode,
} from "../../src/structural-registrar";
import { loadInvariantRegistry } from "../../src/registry/index";
import type { State, Transition, RegistrationResult } from "../../src/types";

// =============================================================================
// Test Helpers
// =============================================================================

function createRootState(
  id: string,
  additionalStructure: Record<string, unknown> = {}
): State {
  return {
    id,
    structure: { isRoot: true, ...additionalStructure },
    data: null,
  };
}

function createChildState(
  id: string,
  structure: Record<string, unknown> = {}
): State {
  return {
    id,
    structure,
    data: null,
  };
}

function createTransition(from: string | null, to: State): Transition {
  return { from, to };
}

/**
 * Normalize result for comparison (strips messages, keeps structure).
 */
function normalizeResult(result: RegistrationResult): {
  kind: string;
  orderIndex?: number;
  invariantIds?: string[];
  hasHalt?: boolean;
} {
  if (result.kind === "accepted") {
    return {
      kind: "accepted",
      orderIndex: result.orderIndex,
    };
  }

  const hasHalt = result.violations.some((v) => v.message.includes("[HALT]"));
  const invariantIds = result.violations.map((v) => v.invariantId).sort();

  return {
    kind: "rejected",
    invariantIds,
    hasHalt,
  };
}

/**
 * Create a pair of registrars in different modes.
 */
function createModePair(): {
  legacy: StructuralRegistrar;
  registry: StructuralRegistrar;
} {
  const registryPath = path.join(
    process.cwd(),
    "invariants",
    "registry.json"
  );
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const compiledRegistry = loadInvariantRegistry(raw);

  return {
    legacy: new StructuralRegistrar({ mode: "legacy" }),
    registry: new StructuralRegistrar({
      mode: "registry",
      compiledRegistry,
    }),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("Registry Mode Parity (C.5)", () => {
  let legacy: StructuralRegistrar;
  let registry: StructuralRegistrar;

  beforeEach(() => {
    const pair = createModePair();
    legacy = pair.legacy;
    registry = pair.registry;
  });

  describe("Mode initialization", () => {
    it("registry mode is default (Phase H)", () => {
      // Registry is now default — requires compiledRegistry
      const registryPath = path.join(
        process.cwd(),
        "invariants",
        "registry.json"
      );
      const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
      const compiledRegistry = loadInvariantRegistry(raw);

      const defaultRegistrar = new StructuralRegistrar({ compiledRegistry });
      expect(defaultRegistrar.getMode()).toBe("registry");
    });

    it("registry mode requires compiledRegistry", () => {
      expect(() => {
        new StructuralRegistrar({ mode: "registry" });
      }).toThrow("registry mode requires compiledRegistry option");

      // Also test default mode without registry
      expect(() => {
        new StructuralRegistrar();
      }).toThrow("registry mode requires compiledRegistry option");
    });

    it("legacy mode is explicitly selectable (secondary witness)", () => {
      const legacyRegistrar = new StructuralRegistrar({ mode: "legacy" });
      expect(legacyRegistrar.getMode()).toBe("legacy");
    });

    it("modes are correctly set", () => {
      expect(legacy.getMode()).toBe("legacy");
      expect(registry.getMode()).toBe("registry");
    });
  });

  describe("Registration parity", () => {
    it("accepts root state identically", () => {
      const state = createRootState("Root");
      const transition = createTransition(null, state);

      const legacyResult = normalizeResult(legacy.register(transition));
      const registryResult = normalizeResult(registry.register(transition));

      expect(registryResult).toEqual(legacyResult);
      expect(legacyResult.kind).toBe("accepted");
    });

    it("rejects empty ID identically", () => {
      const state = createRootState("");
      const transition = createTransition(null, state);

      const legacyResult = normalizeResult(legacy.register(transition));
      const registryResult = normalizeResult(registry.register(transition));

      expect(registryResult).toEqual(legacyResult);
      expect(legacyResult.kind).toBe("rejected");
    });

    it("halts on missing parent identically", () => {
      const state = createChildState("Orphan");
      const transition = createTransition("Missing", state);

      const legacyResult = normalizeResult(legacy.register(transition));
      const registryResult = normalizeResult(registry.register(transition));

      expect(registryResult).toEqual(legacyResult);
      expect(legacyResult.hasHalt).toBe(true);
    });

    it("maintains ordering parity", () => {
      const legacyIndices: number[] = [];
      const registryIndices: number[] = [];

      for (let i = 0; i < 5; i++) {
        const state = createRootState(`State${i}`);
        const transition = createTransition(null, state);

        const legacyResult = legacy.register(transition);
        const registryResult = registry.register(transition);

        if (legacyResult.kind === "accepted") {
          legacyIndices.push(legacyResult.orderIndex);
        }
        if (registryResult.kind === "accepted") {
          registryIndices.push(registryResult.orderIndex);
        }
      }

      expect(registryIndices).toEqual(legacyIndices);
      expect(legacyIndices).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe("Validation parity", () => {
    it("validates state identically", () => {
      const validState = createRootState("Valid");
      const invalidState = createRootState("");

      const legacyValid = legacy.validate(validState);
      const registryValid = registry.validate(validState);
      expect(registryValid.valid).toBe(legacyValid.valid);
      expect(legacyValid.valid).toBe(true);

      const legacyInvalid = legacy.validate(invalidState);
      const registryInvalid = registry.validate(invalidState);
      expect(registryInvalid.valid).toBe(legacyInvalid.valid);
      expect(legacyInvalid.valid).toBe(false);
    });

    it("validates transition identically", () => {
      // Seed parent in both
      const parent = createRootState("Parent");
      legacy.register(createTransition(null, parent));
      registry.register(createTransition(null, parent));

      // Valid transition
      const validChild = createChildState("Parent", { version: 2 });
      const validTransition = createTransition("Parent", validChild);

      const legacyValid = legacy.validate(validTransition);
      const registryValid = registry.validate(validTransition);
      expect(registryValid.valid).toBe(legacyValid.valid);
      expect(legacyValid.valid).toBe(true);

      // Invalid transition (identity mutation)
      const mutatedChild = createChildState("Different");
      const invalidTransition = createTransition("Parent", mutatedChild);

      const legacyInvalid = legacy.validate(invalidTransition);
      const registryInvalid = registry.validate(invalidTransition);
      expect(registryInvalid.valid).toBe(legacyInvalid.valid);
      expect(legacyInvalid.valid).toBe(false);
    });
  });

  describe("Invariant list parity", () => {
    it("lists same invariants", () => {
      const legacyList = legacy.listInvariants();
      const registryList = registry.listInvariants();

      expect(registryList.length).toBe(legacyList.length);
      expect(registryList.length).toBe(11);

      const legacyIds = new Set(legacyList.map((i) => i.id));
      const registryIds = new Set(registryList.map((i) => i.id));
      expect(registryIds).toEqual(legacyIds);
    });

    it("lists same failure modes", () => {
      const legacyList = legacy.listInvariants();
      const registryList = registry.listInvariants();

      const legacyMap = new Map(legacyList.map((i) => [i.id, i.failureMode]));
      const registryMap = new Map(registryList.map((i) => [i.id, i.failureMode]));

      for (const [id, mode] of legacyMap) {
        expect(registryMap.get(id)).toBe(mode);
      }
    });
  });

  describe("Lineage parity", () => {
    it("traces lineage identically", () => {
      // Build chain in both
      const root = createRootState("Chain", { version: 1 });
      legacy.register(createTransition(null, root));
      registry.register(createTransition(null, root));

      for (let i = 2; i <= 5; i++) {
        const state = createChildState("Chain", { version: i });
        legacy.register(createTransition("Chain", state));
        registry.register(createTransition("Chain", state));
      }

      const legacyLineage = legacy.getLineage("Chain");
      const registryLineage = registry.getLineage("Chain");

      expect(registryLineage).toEqual(legacyLineage);
    });

    it("returns empty for unknown state identically", () => {
      const legacyLineage = legacy.getLineage("Unknown");
      const registryLineage = registry.getLineage("Unknown");

      expect(registryLineage).toEqual(legacyLineage);
      expect(legacyLineage).toEqual([]);
    });
  });

  describe("Complex scenarios", () => {
    it("full workflow parity", () => {
      // Simulate a realistic workflow
      const workflow = [
        { type: "register", from: null, id: "Doc1", isRoot: true },
        { type: "register", from: null, id: "Doc2", isRoot: true },
        { type: "register", from: "Doc1", id: "Doc1", version: 2 },
        { type: "register", from: "Doc2", id: "Doc2", version: 2 },
        { type: "register", from: "Doc1", id: "Doc1", version: 3 },
      ];

      const legacyResults: string[] = [];
      const registryResults: string[] = [];

      for (const step of workflow) {
        const state = step.isRoot
          ? createRootState(step.id, step.version ? { version: step.version } : {})
          : createChildState(step.id, { version: step.version });
        const transition = createTransition(step.from, state);

        const legacyResult = legacy.register(transition);
        const registryResult = registry.register(transition);

        legacyResults.push(legacyResult.kind);
        registryResults.push(registryResult.kind);
      }

      expect(registryResults).toEqual(legacyResults);
    });
  });
});
