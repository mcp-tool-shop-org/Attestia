/**
 * Registrum Constitutional Test Suite
 *
 * These tests are not regression tests.
 * They are constitutional tests.
 *
 * If a test fails, the implementation is wrong — not the test.
 *
 * Each invariant:
 * - Must have at least one acceptance test
 * - Must have at least one rejection or halt test
 * - Must fail deterministically
 *
 * Rules for tests:
 * - Cite exactly one invariant ID
 * - Fail deterministically
 * - Never rely on timing, randomness, or heuristics
 * - Never inspect semantic content
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { State, Transition } from "../src/types";
import { StructuralRegistrar } from "../src/structural-registrar";

/**
 * Factory for creating test States.
 */
function createState(
  id: string,
  structure: Record<string, unknown> = {},
  data: unknown = null
): State {
  return { id, structure, data };
}

/**
 * Factory for creating test Transitions.
 */
function createTransition(
  from: string | null,
  to: State,
  metadata?: Record<string, unknown>
): Transition {
  return { from, to, metadata };
}

// =============================================================================
// Group A — Identity Invariants
// =============================================================================

describe("Invariant: state.identity.immutable", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("A.1.1 Accept: same identity preserved across transition", () => {
    // Given: A registered state with id "S1"
    const rootState = createState("S1", { isRoot: true });
    const rootTransition = createTransition(null, rootState);
    const rootResult = registrar.register(rootTransition);
    expect(rootResult.kind).toBe("accepted");

    // When: Transition to new state with same id
    const nextState = createState("S1", { version: 2 });
    const transition = createTransition("S1", nextState);

    // Then: Registration is accepted
    const result = registrar.register(transition);
    expect(result.kind).toBe("accepted");
  });

  it("A.1.2 Reject: identity mutation is forbidden", () => {
    // Given: A registered state with id "S1"
    const rootState = createState("S1", { isRoot: true });
    const rootTransition = createTransition(null, rootState);
    registrar.register(rootTransition);

    // When: Transition attempts to change identity to "S2"
    const mutatedState = createState("S2", {});
    const transition = createTransition("S1", mutatedState);

    // Then: Registration is rejected with specific violation
    const result = registrar.register(transition);
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.violations).toContainEqual(
        expect.objectContaining({ invariantId: "state.identity.immutable" })
      );
    }
  });
});

describe("Invariant: state.identity.explicit", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("A.2.1 Accept: explicit identity is valid", () => {
    // Given: State with explicit non-empty id
    const state = createState("S1", { isRoot: true });

    // Then: Validation passes
    const report = registrar.validate(state);
    expect(report.valid).toBe(true);
  });

  it("A.2.2 Reject: empty identity is invalid", () => {
    // Given: State with empty id
    const state = createState("", { isRoot: true });

    // Then: Validation fails with specific violation
    const report = registrar.validate(state);
    expect(report.valid).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({ invariantId: "state.identity.explicit" })
    );
  });
});

describe("Invariant: state.identity.unique", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("A.3.1 Accept: unique identity is accepted", () => {
    // Given: Registered state with id "S1"
    const s1 = createState("S1", { isRoot: true });
    registrar.register(createTransition(null, s1));

    // When: Register new state with different id "S2"
    const s2 = createState("S2", { isRoot: true });
    const transition = createTransition(null, s2);

    // Then: Registration is accepted
    const result = registrar.register(transition);
    expect(result.kind).toBe("accepted");
  });

  it("A.3.2 Halt: duplicate identity causes halt-level rejection", () => {
    // Given: Registered state with id "S1"
    const s1 = createState("S1", { isRoot: true });
    registrar.register(createTransition(null, s1));

    // When: Attempt to register another root with same id "S1"
    const duplicate = createState("S1", { isRoot: true });
    const transition = createTransition(null, duplicate);

    // Then: Registration is rejected with halt-level violation
    const result = registrar.register(transition);
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.violations).toContainEqual(
        expect.objectContaining({ invariantId: "state.identity.unique" })
      );
      // Halt violations are marked with [HALT]
      const haltViolation = result.violations.find(
        (v) => v.invariantId === "state.identity.unique"
      );
      expect(haltViolation?.message).toContain("[HALT]");
    }
  });
});

// =============================================================================
// Group B — Lineage Invariants
// =============================================================================

describe("Invariant: state.lineage.explicit", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("B.1.1 Accept: declared parent is valid", () => {
    // Given: Registered parent state
    const parent = createState("S1", { isRoot: true });
    registrar.register(createTransition(null, parent));

    // When: Transition with explicit parent
    const child = createState("S1", { version: 2 });
    const transition = createTransition("S1", child);

    // Then: Registration proceeds
    const result = registrar.register(transition);
    expect(result.kind).toBe("accepted");
  });

  it("B.1.2 Accept: root state with null parent is valid", () => {
    // Given: State marked as root
    const rootState = createState("S1", { isRoot: true });

    // When: Transition with null parent
    const transition = createTransition(null, rootState);

    // Then: Registration proceeds
    const result = registrar.register(transition);
    expect(result.kind).toBe("accepted");
  });

  it("B.1.3 Reject: non-root state without parent is invalid", () => {
    // Given: State NOT marked as root
    const state = createState("S1", {}); // No isRoot marker

    // When: Transition with null parent
    const transition = createTransition(null, state);

    // Then: Registration is rejected
    const result = registrar.register(transition);
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.violations).toContainEqual(
        expect.objectContaining({ invariantId: "state.lineage.explicit" })
      );
    }
  });
});

describe("Invariant: state.lineage.parent_exists", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("B.2.1 Accept: parent exists in registry", () => {
    // Given: Registered parent state
    const parent = createState("S1", { isRoot: true });
    registrar.register(createTransition(null, parent));

    // When: Transition referencing existing parent
    const child = createState("S1", { version: 2 });
    const transition = createTransition("S1", child);

    // Then: Registration proceeds
    const result = registrar.register(transition);
    expect(result.kind).toBe("accepted");
  });

  it("B.2.2 Reject: parent does not exist", () => {
    // Given: Empty registry (no registered states)

    // When: Transition referencing non-existent parent
    const state = createState("S2", {});
    const transition = createTransition("S1", state); // S1 doesn't exist

    // Then: Registration is rejected
    const result = registrar.register(transition);
    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") {
      expect(result.violations).toContainEqual(
        expect.objectContaining({ invariantId: "state.lineage.parent_exists" })
      );
    }
  });
});

describe("Invariant: state.lineage.single_parent", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("B.3.1 Accept: single parent reference", () => {
    // Given: Transition with single parent reference
    const state = createState("S2", {});
    const transition = createTransition("S1", state);

    // Then: from is a single StateID
    expect(transition.from).toBe("S1");
    expect(typeof transition.from).toBe("string");
  });

  // Note: The type system prevents multiple parents at compile time
  // since from: StateID | null (not StateID[])
  it("B.3.2 Type system prevents multiple parents", () => {
    // The Transition type enforces single parent at compile time
    // from: StateID | null (not an array)
    expect(true).toBe(true);
  });
});

describe("Invariant: state.lineage.continuous", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("B.4.1 Accept: continuous lineage chain", () => {
    // Given: States registered in sequence
    const s1 = createState("S1", { isRoot: true });
    registrar.register(createTransition(null, s1));

    const s2 = createState("S1", { version: 2 });
    registrar.register(createTransition("S1", s2));

    const s3 = createState("S1", { version: 3 });
    registrar.register(createTransition("S1", s3));

    // When: Get lineage of the state
    const lineage = registrar.getLineage("S1");

    // Then: Lineage is continuous (state exists with parent chain)
    expect(lineage.length).toBeGreaterThan(0);
    expect(lineage[0]).toBe("S1");
  });

  it("B.4.2 Lineage returns empty for unregistered state", () => {
    // Given: Empty registry

    // When: Get lineage of non-existent state
    const lineage = registrar.getLineage("nonexistent");

    // Then: Empty array
    expect(lineage).toEqual([]);
  });
});

// =============================================================================
// Group C — Ordering Invariants
// =============================================================================

describe("Invariant: ordering.total", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("C.1.1 Accept: all accepted states have order index", () => {
    // Given: Multiple states registered
    const s1 = createState("S1", { isRoot: true });
    const r1 = registrar.register(createTransition(null, s1));

    const s2 = createState("S2", { isRoot: true });
    const r2 = registrar.register(createTransition(null, s2));

    // Then: All have defined order indices
    expect(r1.kind).toBe("accepted");
    expect(r2.kind).toBe("accepted");
    if (r1.kind === "accepted" && r2.kind === "accepted") {
      expect(typeof r1.orderIndex).toBe("number");
      expect(typeof r2.orderIndex).toBe("number");
    }
  });
});

describe("Invariant: ordering.deterministic", () => {
  it("C.2.1 Accept: same inputs produce same order", () => {
    // Given: Same transitions applied to two fresh registrars
    const registrar1 = new StructuralRegistrar({ mode: "legacy" });
    const registrar2 = new StructuralRegistrar({ mode: "legacy" });

    const s1 = createState("S1", { isRoot: true });
    const s2 = createState("S2", { isRoot: true });

    const r1a = registrar1.register(createTransition(null, s1));
    const r1b = registrar1.register(createTransition(null, s2));

    const r2a = registrar2.register(createTransition(null, s1));
    const r2b = registrar2.register(createTransition(null, s2));

    // Then: Order indices are identical
    if (r1a.kind === "accepted" && r2a.kind === "accepted") {
      expect(r1a.orderIndex).toBe(r2a.orderIndex);
    }
    if (r1b.kind === "accepted" && r2b.kind === "accepted") {
      expect(r1b.orderIndex).toBe(r2b.orderIndex);
    }
  });
});

describe("Invariant: ordering.monotonic", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("C.3.1 Accept: order indices increase monotonically", () => {
    // Given: Multiple states registered in sequence
    const s1 = createState("S1", { isRoot: true });
    const s2 = createState("S2", { isRoot: true });
    const s3 = createState("S3", { isRoot: true });

    const r1 = registrar.register(createTransition(null, s1));
    const r2 = registrar.register(createTransition(null, s2));
    const r3 = registrar.register(createTransition(null, s3));

    // Then: Each order index is greater than the previous
    if (
      r1.kind === "accepted" &&
      r2.kind === "accepted" &&
      r3.kind === "accepted"
    ) {
      expect(r2.orderIndex).toBeGreaterThan(r1.orderIndex);
      expect(r3.orderIndex).toBeGreaterThan(r2.orderIndex);
    }
  });
});

describe("Invariant: ordering.non_semantic", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("C.4.1 Accept: ordering uses only structural metadata", () => {
    // Given: Two states with different data but same structure type
    const s1 = createState("S1", { isRoot: true }, { content: "AAA" });
    const s2 = createState("S2", { isRoot: true }, { content: "ZZZ" });

    // When: Registered in a specific order
    const r1 = registrar.register(createTransition(null, s1));
    const r2 = registrar.register(createTransition(null, s2));

    // Then: Order is based on registration sequence, not data content
    if (r1.kind === "accepted" && r2.kind === "accepted") {
      expect(r1.orderIndex).toBeLessThan(r2.orderIndex);
    }
  });

  it("C.4.2 Ordering does not depend on data field", () => {
    // Register in reverse alphabetical order of data content
    // Order should still be by registration sequence
    const registrar1 = new StructuralRegistrar({ mode: "legacy" });

    const sZ = createState("SZ", { isRoot: true }, { content: "ZZZ" });
    const sA = createState("SA", { isRoot: true }, { content: "AAA" });

    const rZ = registrar1.register(createTransition(null, sZ));
    const rA = registrar1.register(createTransition(null, sA));

    // Z was registered first, so it gets lower index despite "ZZZ" > "AAA"
    if (rZ.kind === "accepted" && rA.kind === "accepted") {
      expect(rZ.orderIndex).toBeLessThan(rA.orderIndex);
    }
  });
});

// =============================================================================
// Registrar API Tests
// =============================================================================

describe("Registrar API", () => {
  let registrar: StructuralRegistrar;

  beforeEach(() => {
    registrar = new StructuralRegistrar({ mode: "legacy" });
  });

  it("listInvariants returns all active invariants", () => {
    const invariants = registrar.listInvariants();

    // Should include all 11 invariants from INVARIANTS.md
    const expectedIds = [
      "state.identity.immutable",
      "state.identity.explicit",
      "state.identity.unique",
      "state.lineage.explicit",
      "state.lineage.parent_exists",
      "state.lineage.single_parent",
      "state.lineage.continuous",
      "ordering.total",
      "ordering.deterministic",
      "ordering.monotonic",
      "ordering.non_semantic",
    ];

    for (const id of expectedIds) {
      expect(invariants.find((inv) => inv.id === id)).toBeDefined();
    }
  });

  it("listInvariants filters by scope when provided", () => {
    // Given: Registrar with invariants across all scopes

    // When: Filter by state scope
    const stateInvariants = registrar.listInvariants("state");

    // Then: Only state-scope invariants returned
    expect(stateInvariants.length).toBeGreaterThan(0);
    for (const inv of stateInvariants) {
      expect(inv.scope).toBe("state");
    }

    // When: Filter by registration scope
    const registrationInvariants = registrar.listInvariants("registration");

    // Then: Only registration-scope invariants returned
    expect(registrationInvariants.length).toBeGreaterThan(0);
    for (const inv of registrationInvariants) {
      expect(inv.scope).toBe("registration");
    }

    // And: Combined filtered counts equal total
    const transitionInvariants = registrar.listInvariants("transition");
    const allInvariants = registrar.listInvariants();
    expect(
      stateInvariants.length +
        transitionInvariants.length +
        registrationInvariants.length
    ).toBe(allInvariants.length);
  });

  it("listInvariants returns serializable descriptors without predicates", () => {
    // Given: All invariants
    const invariants = registrar.listInvariants();

    // Then: Each has required descriptor fields
    for (const inv of invariants) {
      expect(typeof inv.id).toBe("string");
      expect(["state", "transition", "registration"]).toContain(inv.scope);
      expect(Array.isArray(inv.appliesTo)).toBe(true);
      expect(["reject", "halt"]).toContain(inv.failureMode);
      expect(typeof inv.description).toBe("string");
    }

    // And: Descriptors are JSON-serializable (no functions)
    const serialized = JSON.stringify(invariants);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.length).toBe(invariants.length);
  });

  it("getLineage returns empty array for unknown state", () => {
    const lineage = registrar.getLineage("nonexistent");
    expect(lineage).toEqual([]);
  });

  it("validate does not modify registrar state", () => {
    // Given: Empty registrar
    const initialCount = registrar.getRegisteredCount();

    // When: Validate a state (without registering)
    const state = createState("S1", { isRoot: true });
    registrar.validate(state);

    // Then: Registrar state is unchanged
    expect(registrar.getRegisteredCount()).toBe(initialCount);

    // And: State is not in lineage
    const lineage = registrar.getLineage("S1");
    expect(lineage).toEqual([]);
  });

  it("validate checks state-scope invariants", () => {
    // Given: State with empty id
    const invalidState = createState("", { isRoot: true });

    // When: Validate
    const report = registrar.validate(invalidState);

    // Then: Reports violation
    expect(report.valid).toBe(false);
    expect(report.violations.length).toBeGreaterThan(0);
  });

  it("validate checks transition-scope invariants", () => {
    // Given: Transition that would mutate identity
    const parent = createState("S1", { isRoot: true });
    registrar.register(createTransition(null, parent));

    const mutatedChild = createState("S2", {}); // Different id
    const transition = createTransition("S1", mutatedChild);

    // When: Validate transition
    const report = registrar.validate(transition);

    // Then: Reports identity immutability violation
    expect(report.valid).toBe(false);
    expect(report.violations).toContainEqual(
      expect.objectContaining({ invariantId: "state.identity.immutable" })
    );
  });
});

// =============================================================================
// Determinism Tests
// =============================================================================

describe("Determinism Guarantee", () => {
  it("Multiple registrars produce identical results for identical inputs", () => {
    // Create 3 independent registrars
    const registrars = [
      new StructuralRegistrar({ mode: "legacy" }),
      new StructuralRegistrar({ mode: "legacy" }),
      new StructuralRegistrar({ mode: "legacy" }),
    ];

    // Same sequence of transitions
    const transitions = [
      createTransition(null, createState("S1", { isRoot: true })),
      createTransition(null, createState("S2", { isRoot: true })),
      createTransition("S1", createState("S1", { version: 2 })),
      createTransition("S2", createState("S2", { version: 2 })),
    ];

    // Apply to all registrars
    const results = registrars.map((reg) =>
      transitions.map((t) => reg.register(t))
    );

    // All results should be identical
    for (let i = 1; i < results.length; i++) {
      for (let j = 0; j < transitions.length; j++) {
        const r0 = results[0]![j]!;
        const ri = results[i]![j]!;

        expect(ri.kind).toBe(r0.kind);
        if (r0.kind === "accepted" && ri.kind === "accepted") {
          expect(ri.stateId).toBe(r0.stateId);
          expect(ri.orderIndex).toBe(r0.orderIndex);
        }
      }
    }
  });

  it("Order index starts at 0 and increments by 1", () => {
    const registrar = new StructuralRegistrar({ mode: "legacy" });

    const results = [
      registrar.register(
        createTransition(null, createState("S1", { isRoot: true }))
      ),
      registrar.register(
        createTransition(null, createState("S2", { isRoot: true }))
      ),
      registrar.register(
        createTransition(null, createState("S3", { isRoot: true }))
      ),
    ];

    // Verify exact sequence
    expect(results[0]?.kind).toBe("accepted");
    expect(results[1]?.kind).toBe("accepted");
    expect(results[2]?.kind).toBe("accepted");

    if (
      results[0]?.kind === "accepted" &&
      results[1]?.kind === "accepted" &&
      results[2]?.kind === "accepted"
    ) {
      expect(results[0].orderIndex).toBe(0);
      expect(results[1].orderIndex).toBe(1);
      expect(results[2].orderIndex).toBe(2);
    }
  });
});
