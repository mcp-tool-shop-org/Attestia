/**
 * Snapshot Schema Tests (E.1)
 *
 * Tests that the snapshot schema:
 * - Validates all required fields
 * - Rejects unknown fields (strict mode)
 * - Rejects missing fields
 * - Validates internal consistency
 */

import { describe, it, expect } from "vitest";
import {
  validateSnapshot,
  SnapshotValidationError,
  SNAPSHOT_VERSION,
  computeLegacyRegistryHash,
  computeRegistryHash,
  type RegistrarSnapshotV1,
} from "../../src/persistence/snapshot";

// =============================================================================
// Test Helpers
// =============================================================================

function createValidSnapshot(
  overrides: Partial<RegistrarSnapshotV1> = {}
): RegistrarSnapshotV1 {
  return {
    version: SNAPSHOT_VERSION,
    registry_hash: "legacy:inv1,inv2,inv3",
    mode: "legacy",
    state_ids: ["A", "B"],
    lineage: { A: null, B: "A" },
    ordering: {
      max_index: 1,
      assigned: { A: 0, B: 1 },
    },
    ...overrides,
  };
}

function createEmptySnapshot(): RegistrarSnapshotV1 {
  return {
    version: SNAPSHOT_VERSION,
    registry_hash: "legacy:inv1,inv2",
    mode: "legacy",
    state_ids: [],
    lineage: {},
    ordering: {
      max_index: -1,
      assigned: {},
    },
  };
}

// =============================================================================
// Schema Validation Tests
// =============================================================================

describe("Snapshot Schema Validation (E.1)", () => {
  describe("Valid snapshots", () => {
    it("accepts a valid snapshot", () => {
      const snapshot = createValidSnapshot();
      expect(() => validateSnapshot(snapshot)).not.toThrow();
    });

    it("accepts an empty snapshot", () => {
      const snapshot = createEmptySnapshot();
      expect(() => validateSnapshot(snapshot)).not.toThrow();
    });

    it("accepts snapshot with registry mode", () => {
      const snapshot = createValidSnapshot({
        mode: "registry",
        registry_hash: "registry:registrum.invariants.v1",
      });
      expect(() => validateSnapshot(snapshot)).not.toThrow();
    });

    it("accepts snapshot with many states", () => {
      const stateIds = Array.from({ length: 100 }, (_, i) => `State${i}`);
      const lineage: Record<string, string | null> = {};
      const assigned: Record<string, number> = {};

      stateIds.forEach((id, index) => {
        lineage[id] = index === 0 ? null : stateIds[index - 1];
        assigned[id] = index;
      });

      const snapshot = createValidSnapshot({
        state_ids: stateIds,
        lineage,
        ordering: {
          max_index: 99,
          assigned,
        },
      });

      expect(() => validateSnapshot(snapshot)).not.toThrow();
    });
  });

  describe("Type validation", () => {
    it("rejects non-object", () => {
      expect(() => validateSnapshot(null)).toThrow(SnapshotValidationError);
      expect(() => validateSnapshot("string")).toThrow(SnapshotValidationError);
      expect(() => validateSnapshot(123)).toThrow(SnapshotValidationError);
      expect(() => validateSnapshot([])).toThrow(SnapshotValidationError);
    });

    it("rejects wrong version", () => {
      const snapshot = { ...createValidSnapshot(), version: "2.0" };
      expect(() => validateSnapshot(snapshot)).toThrow(/Unsupported version/);
    });

    it("rejects empty registry_hash", () => {
      const snapshot = { ...createValidSnapshot(), registry_hash: "" };
      expect(() => validateSnapshot(snapshot)).toThrow(/registry_hash/);
    });

    it("rejects non-string registry_hash", () => {
      const snapshot = { ...createValidSnapshot(), registry_hash: 123 };
      expect(() => validateSnapshot(snapshot)).toThrow(/registry_hash/);
    });

    it("rejects invalid mode", () => {
      const snapshot = { ...createValidSnapshot(), mode: "invalid" };
      expect(() => validateSnapshot(snapshot)).toThrow(/mode/);
    });

    it("rejects non-array state_ids", () => {
      const snapshot = { ...createValidSnapshot(), state_ids: "not-array" };
      expect(() => validateSnapshot(snapshot)).toThrow(/state_ids/);
    });

    it("rejects non-string in state_ids", () => {
      const snapshot = { ...createValidSnapshot(), state_ids: ["A", 123] };
      expect(() => validateSnapshot(snapshot)).toThrow(/state_ids\[1\]/);
    });

    it("rejects non-object lineage", () => {
      const snapshot = { ...createValidSnapshot(), lineage: "not-object" };
      expect(() => validateSnapshot(snapshot)).toThrow(/lineage/);
    });

    it("rejects invalid lineage value", () => {
      const snapshot = {
        ...createValidSnapshot(),
        lineage: { A: null, B: 123 },
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/lineage\['B'\]/);
    });

    it("rejects non-integer max_index", () => {
      const snapshot = {
        ...createValidSnapshot(),
        ordering: { ...createValidSnapshot().ordering, max_index: 1.5 },
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/max_index/);
    });

    it("rejects non-integer order index", () => {
      const snapshot = {
        ...createValidSnapshot(),
        ordering: {
          max_index: 1,
          assigned: { A: 0, B: 1.5 },
        },
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/ordering\.assigned\['B'\]/);
    });
  });

  describe("Unknown field rejection (strict mode)", () => {
    it("rejects unknown top-level fields", () => {
      const snapshot = {
        ...createValidSnapshot(),
        unknown_field: "value",
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/Unknown field 'unknown_field'/);
    });

    it("rejects derived metrics", () => {
      const snapshot = {
        ...createValidSnapshot(),
        state_count: 2, // Derived metric - forbidden
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/Unknown field/);
    });

    it("rejects summaries", () => {
      const snapshot = {
        ...createValidSnapshot(),
        lineage_summary: { depth: 2 }, // Summary - forbidden
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/Unknown field/);
    });

    it("rejects caches", () => {
      const snapshot = {
        ...createValidSnapshot(),
        lookup_cache: {}, // Cache - forbidden
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/Unknown field/);
    });

    it("rejects replay hints", () => {
      const snapshot = {
        ...createValidSnapshot(),
        replay_hint: "fast-path", // Hint - forbidden
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/Unknown field/);
    });

    it("rejects timestamps", () => {
      const snapshot = {
        ...createValidSnapshot(),
        created_at: Date.now(), // Timestamp - forbidden
      };
      expect(() => validateSnapshot(snapshot)).toThrow(/Unknown field/);
    });
  });

  describe("Missing field rejection", () => {
    it("rejects missing version", () => {
      const snapshot = createValidSnapshot();
      delete (snapshot as Record<string, unknown>).version;
      expect(() => validateSnapshot(snapshot)).toThrow(/version/);
    });

    it("rejects missing registry_hash", () => {
      const snapshot = createValidSnapshot();
      delete (snapshot as Record<string, unknown>).registry_hash;
      expect(() => validateSnapshot(snapshot)).toThrow(/registry_hash/);
    });

    it("rejects missing mode", () => {
      const snapshot = createValidSnapshot();
      delete (snapshot as Record<string, unknown>).mode;
      expect(() => validateSnapshot(snapshot)).toThrow(/mode/);
    });

    it("rejects missing state_ids", () => {
      const snapshot = createValidSnapshot();
      delete (snapshot as Record<string, unknown>).state_ids;
      expect(() => validateSnapshot(snapshot)).toThrow(/state_ids/);
    });

    it("rejects missing lineage", () => {
      const snapshot = createValidSnapshot();
      delete (snapshot as Record<string, unknown>).lineage;
      expect(() => validateSnapshot(snapshot)).toThrow(/lineage/);
    });

    it("rejects missing ordering", () => {
      const snapshot = createValidSnapshot();
      delete (snapshot as Record<string, unknown>).ordering;
      expect(() => validateSnapshot(snapshot)).toThrow(/ordering/);
    });
  });

  describe("Consistency validation", () => {
    it("rejects state_id without lineage entry", () => {
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B", "C"],
        lineage: { A: null, B: "A" }, // Missing C
        ordering: {
          max_index: 2,
          assigned: { A: 0, B: 1, C: 2 },
        },
      });
      expect(() => validateSnapshot(snapshot)).toThrow(/State 'C'.*no lineage/);
    });

    it("rejects lineage entry without state_id", () => {
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B"],
        lineage: { A: null, B: "A", C: "A" }, // Extra C
        ordering: {
          max_index: 1,
          assigned: { A: 0, B: 1 },
        },
      });
      expect(() => validateSnapshot(snapshot)).toThrow(/Lineage entry 'C'.*no corresponding/);
    });

    it("rejects lineage parent that does not exist", () => {
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B"],
        lineage: { A: null, B: "NonExistent" }, // Invalid parent
        ordering: {
          max_index: 1,
          assigned: { A: 0, B: 1 },
        },
      });
      expect(() => validateSnapshot(snapshot)).toThrow(/parent 'NonExistent'.*does not exist/);
    });

    it("rejects state_id without ordering entry", () => {
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B", "C"],
        lineage: { A: null, B: "A", C: "B" },
        ordering: {
          max_index: 2,
          assigned: { A: 0, B: 1 }, // Missing C
        },
      });
      expect(() => validateSnapshot(snapshot)).toThrow(/State 'C'.*no ordering/);
    });

    it("rejects ordering entry without state_id", () => {
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B"],
        lineage: { A: null, B: "A" },
        ordering: {
          max_index: 2,
          assigned: { A: 0, B: 1, C: 2 }, // Extra C
        },
      });
      expect(() => validateSnapshot(snapshot)).toThrow(/Ordering entry 'C'.*no corresponding/);
    });

    it("rejects incorrect max_index", () => {
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B"],
        lineage: { A: null, B: "A" },
        ordering: {
          max_index: 5, // Wrong - highest assigned is 1
          assigned: { A: 0, B: 1 },
        },
      });
      expect(() => validateSnapshot(snapshot)).toThrow(/max_index.*should equal highest assigned/);
    });

    it("rejects duplicate order indices", () => {
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B"],
        lineage: { A: null, B: "A" },
        ordering: {
          max_index: 0,
          assigned: { A: 0, B: 0 }, // Duplicate
        },
      });
      expect(() => validateSnapshot(snapshot)).toThrow(/Order indices must be unique/);
    });

    it("accepts non-contiguous order indices", () => {
      // This is valid: states can have non-contiguous indices
      // (e.g., when the same ID is re-registered, overwriting previous entry)
      const snapshot = createValidSnapshot({
        state_ids: ["A", "B"],
        lineage: { A: null, B: "A" },
        ordering: {
          max_index: 5, // Highest assigned is 5
          assigned: { A: 2, B: 5 }, // Gap is OK
        },
      });
      expect(() => validateSnapshot(snapshot)).not.toThrow();
    });
  });
});

// =============================================================================
// Registry Hash Tests
// =============================================================================

describe("Registry Hash Computation", () => {
  describe("Legacy mode hash", () => {
    it("computes deterministic hash from invariant IDs", () => {
      const hash1 = computeLegacyRegistryHash(["a", "b", "c"]);
      const hash2 = computeLegacyRegistryHash(["a", "b", "c"]);
      expect(hash1).toBe(hash2);
    });

    it("sorts IDs for determinism", () => {
      const hash1 = computeLegacyRegistryHash(["c", "a", "b"]);
      const hash2 = computeLegacyRegistryHash(["a", "b", "c"]);
      expect(hash1).toBe(hash2);
    });

    it("includes legacy prefix", () => {
      const hash = computeLegacyRegistryHash(["inv1"]);
      expect(hash).toMatch(/^legacy:/);
    });

    it("produces different hashes for different invariants", () => {
      const hash1 = computeLegacyRegistryHash(["a", "b"]);
      const hash2 = computeLegacyRegistryHash(["a", "c"]);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Registry mode hash", () => {
    it("uses registry_id directly", () => {
      const hash = computeRegistryHash("registrum.invariants.v1");
      expect(hash).toBe("registry:registrum.invariants.v1");
    });

    it("includes registry prefix", () => {
      const hash = computeRegistryHash("test");
      expect(hash).toMatch(/^registry:/);
    });

    it("produces different hashes for different registries", () => {
      const hash1 = computeRegistryHash("v1");
      const hash2 = computeRegistryHash("v2");
      expect(hash1).not.toBe(hash2);
    });
  });
});
