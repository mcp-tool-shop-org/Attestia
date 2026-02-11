/**
 * Registrar Rehydration Tests (E.3)
 *
 * Tests that:
 * - Valid snapshots rehydrate correctly
 * - Invalid snapshots fail hard (no partial recovery)
 * - Registry hash mismatches are detected
 * - Mode mismatches are detected
 * - Rehydrated registrar produces identical outcomes
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import { StructuralRegistrar } from "../../src/structural-registrar";
import { loadInvariantRegistry } from "../../src/registry/loader";
import { INITIAL_INVARIANTS } from "../../src/invariants";
import {
  serializeSnapshot,
  deserializeSnapshot,
  validateSnapshot,
  SnapshotValidationError,
  RehydrationError,
  RegistryMismatchError,
  ModeMismatchError,
  type RegistrarSnapshotV1,
} from "../../src/persistence";

// =============================================================================
// Test Helpers
// =============================================================================

function createRootState(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    structure: { isRoot: true, ...extra },
    data: null,
  };
}

function createTransition(from: string | null, to: ReturnType<typeof createRootState>) {
  return { from, to };
}

function createLegacyRegistrar() {
  return new StructuralRegistrar({ mode: "legacy" });
}

function createRegistryRegistrar() {
  const registryPath = path.join(process.cwd(), "invariants", "registry.json");
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  const compiledRegistry = loadInvariantRegistry(raw);
  return new StructuralRegistrar({ mode: "registry", compiledRegistry });
}

function getCompiledRegistry() {
  const registryPath = path.join(process.cwd(), "invariants", "registry.json");
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  return loadInvariantRegistry(raw);
}

function seedStates(registrar: StructuralRegistrar, count: number) {
  for (let i = 0; i < count; i++) {
    const state = createRootState(`State${i}`, { version: i });
    registrar.register(createTransition(null, state));
  }
}

// =============================================================================
// Rehydration Tests
// =============================================================================

describe("Registrar Rehydration (E.3)", () => {
  describe("Successful rehydration", () => {
    it("rehydrates empty registrar", () => {
      const original = createLegacyRegistrar();
      const snapshot = original.snapshot();

      const rehydrated = StructuralRegistrar.fromSnapshot(snapshot, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(rehydrated.getRegisteredCount()).toBe(0);
      expect(rehydrated.getCurrentOrderIndex()).toBe(0);
      expect(rehydrated.getMode()).toBe("legacy");
    });

    it("rehydrates registrar with states", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 5);

      const snapshot = original.snapshot();
      const rehydrated = StructuralRegistrar.fromSnapshot(snapshot, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(rehydrated.getRegisteredCount()).toBe(5);
      expect(rehydrated.getCurrentOrderIndex()).toBe(5);

      // Verify all states are registered
      for (let i = 0; i < 5; i++) {
        expect(rehydrated.isRegistered(`State${i}`)).toBe(true);
      }
    });

    it("rehydrates registry mode registrar", () => {
      const original = createRegistryRegistrar();
      seedStates(original, 3);

      const snapshot = original.snapshot();
      const rehydrated = StructuralRegistrar.fromSnapshot(snapshot, {
        mode: "registry",
        compiledRegistry: getCompiledRegistry(),
      });

      expect(rehydrated.getRegisteredCount()).toBe(3);
      expect(rehydrated.getMode()).toBe("registry");
    });

    it("rehydrates from JSON string", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 3);

      const json = serializeSnapshot(original.snapshot());
      const parsed = deserializeSnapshot(json);

      const rehydrated = StructuralRegistrar.fromSnapshot(parsed, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(rehydrated.getRegisteredCount()).toBe(3);
    });
  });

  describe("Round-trip correctness", () => {
    it("snapshot → rehydrate produces identical snapshot", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 5);

      const snapshot1 = original.snapshot();
      const rehydrated = StructuralRegistrar.fromSnapshot(snapshot1, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });
      const snapshot2 = rehydrated.snapshot();

      // Snapshots should be identical
      const json1 = serializeSnapshot(snapshot1);
      const json2 = serializeSnapshot(snapshot2);
      expect(json1).toBe(json2);
    });

    it("rehydrated registrar can continue registration", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 3);

      const rehydrated = StructuralRegistrar.fromSnapshot(original.snapshot(), {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Continue registration
      const newState = createRootState("NewState");
      const result = rehydrated.register(createTransition(null, newState));

      expect(result.kind).toBe("accepted");
      if (result.kind === "accepted") {
        expect(result.orderIndex).toBe(3); // Continues from 3
      }

      expect(rehydrated.getRegisteredCount()).toBe(4);
    });

    it("rehydrated registrar produces identical validation results", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 3);

      const rehydrated = StructuralRegistrar.fromSnapshot(original.snapshot(), {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Test validation on both
      const validState = createRootState("Valid");
      const invalidState = { id: "", structure: {}, data: null };

      expect(rehydrated.validate(validState).valid).toBe(
        original.validate(validState).valid
      );
      expect(rehydrated.validate(invalidState).valid).toBe(
        original.validate(invalidState).valid
      );
    });

    it("lineage is preserved after rehydration", () => {
      const original = createLegacyRegistrar();

      // Create a chain
      original.register(createTransition(null, createRootState("Root", { version: 1 })));
      original.register(
        createTransition("Root", { id: "Root", structure: { version: 2 }, data: null })
      );
      original.register(
        createTransition("Root", { id: "Root", structure: { version: 3 }, data: null })
      );

      const rehydrated = StructuralRegistrar.fromSnapshot(original.snapshot(), {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Lineage should match
      expect(rehydrated.getLineage("Root")).toEqual(original.getLineage("Root"));
    });
  });

  describe("Fail-closed behavior", () => {
    it("rejects invalid snapshot schema", () => {
      expect(() => {
        StructuralRegistrar.fromSnapshot({ invalid: "data" }, {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        });
      }).toThrow(SnapshotValidationError);
    });

    it("rejects snapshot with wrong version", () => {
      const original = createLegacyRegistrar();
      const snapshot = { ...original.snapshot(), version: "2.0" };

      expect(() => {
        StructuralRegistrar.fromSnapshot(snapshot, {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        });
      }).toThrow(SnapshotValidationError);
    });

    it("rejects mode mismatch", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 2);
      const snapshot = original.snapshot();

      expect(() => {
        StructuralRegistrar.fromSnapshot(snapshot, {
          mode: "registry",
          compiledRegistry: getCompiledRegistry(),
        });
      }).toThrow(ModeMismatchError);
    });

    it("rejects registry hash mismatch", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 2);

      // Modify the registry hash
      const snapshot = {
        ...original.snapshot(),
        registry_hash: "legacy:different,set,of,invariants",
      };

      expect(() => {
        StructuralRegistrar.fromSnapshot(snapshot, {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        });
      }).toThrow(RegistryMismatchError);
    });

    it("rejects registry mode without compiledRegistry", () => {
      const original = createRegistryRegistrar();
      const snapshot = original.snapshot();

      expect(() => {
        StructuralRegistrar.fromSnapshot(snapshot, {
          mode: "registry",
          // Missing compiledRegistry
        });
      }).toThrow(RehydrationError);
    });

    it("rejects legacy mode without invariants", () => {
      const original = createLegacyRegistrar();
      const snapshot = original.snapshot();

      expect(() => {
        StructuralRegistrar.fromSnapshot(snapshot, {
          mode: "legacy",
          // Missing invariants
        });
      }).toThrow(RehydrationError);
    });

    it("rejects snapshot with inconsistent state", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 2);
      const snapshot = original.snapshot() as Record<string, unknown>;

      // Corrupt the snapshot by adding extra state_id without lineage
      const corrupted = {
        ...snapshot,
        state_ids: [...(snapshot.state_ids as string[]), "GhostState"],
      };

      expect(() => {
        StructuralRegistrar.fromSnapshot(corrupted, {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        });
      }).toThrow(SnapshotValidationError);
    });
  });

  describe("Registry mode specifics", () => {
    it("rehydrates with correct registry hash", () => {
      const original = createRegistryRegistrar();
      seedStates(original, 3);

      const rehydrated = StructuralRegistrar.fromSnapshot(original.snapshot(), {
        mode: "registry",
        compiledRegistry: getCompiledRegistry(),
      });

      // Snapshot hashes should match
      expect(rehydrated.snapshot().registry_hash).toBe(
        original.snapshot().registry_hash
      );
    });

    it("rejects registry ID mismatch", () => {
      const original = createRegistryRegistrar();
      seedStates(original, 2);

      // Create snapshot with modified registry hash
      const snapshot = {
        ...original.snapshot(),
        registry_hash: "registry:wrong.registry.id",
      };

      expect(() => {
        StructuralRegistrar.fromSnapshot(snapshot, {
          mode: "registry",
          compiledRegistry: getCompiledRegistry(),
        });
      }).toThrow(RegistryMismatchError);
    });
  });

  describe("Edge cases", () => {
    it("handles large registrar", () => {
      const original = createLegacyRegistrar();
      seedStates(original, 100);

      const rehydrated = StructuralRegistrar.fromSnapshot(original.snapshot(), {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(rehydrated.getRegisteredCount()).toBe(100);

      // Snapshots should match
      const json1 = serializeSnapshot(original.snapshot());
      const json2 = serializeSnapshot(rehydrated.snapshot());
      expect(json1).toBe(json2);
    });

    it("handles registrar with complex lineage", () => {
      const original = createLegacyRegistrar();

      // Create tree structure
      original.register(createTransition(null, createRootState("A")));
      original.register(createTransition(null, createRootState("B")));
      original.register(createTransition(null, createRootState("C")));

      // Extend each
      for (let i = 2; i <= 3; i++) {
        original.register(
          createTransition("A", { id: "A", structure: { version: i }, data: null })
        );
        original.register(
          createTransition("B", { id: "B", structure: { version: i }, data: null })
        );
      }

      const rehydrated = StructuralRegistrar.fromSnapshot(original.snapshot(), {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // All lineages should match
      expect(rehydrated.getLineage("A")).toEqual(original.getLineage("A"));
      expect(rehydrated.getLineage("B")).toEqual(original.getLineage("B"));
      expect(rehydrated.getLineage("C")).toEqual(original.getLineage("C"));
    });
  });
});
