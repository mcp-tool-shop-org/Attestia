/**
 * Transition Replay Engine Tests (E.4)
 *
 * Tests that:
 * - Live execution equals replayed execution
 * - Legacy mode equals registry mode under replay
 * - Replay after rehydration equals original run
 * - Replay is deterministic
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import { StructuralRegistrar } from "../../src/structural-registrar";
import { loadInvariantRegistry } from "../../src/registry/loader";
import { INITIAL_INVARIANTS } from "../../src/invariants";
import type { Transition } from "../../src/types";
import {
  replay,
  compareReplayReports,
  createTransitionRecorder,
  type ReplayReport,
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

function createChildState(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    structure: extra,
    data: null,
  };
}

function createTransition(
  from: string | null,
  to: ReturnType<typeof createRootState>
): Transition {
  return { from, to };
}

function getCompiledRegistry() {
  const registryPath = path.join(process.cwd(), "invariants", "registry.json");
  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  return loadInvariantRegistry(raw);
}

/**
 * Create a standard test transition sequence.
 */
function createTestTransitions(): Transition[] {
  return [
    // Valid root states
    createTransition(null, createRootState("A")),
    createTransition(null, createRootState("B")),
    createTransition(null, createRootState("C")),
    // Extensions
    createTransition("A", createChildState("A", { version: 2 })),
    createTransition("B", createChildState("B", { version: 2 })),
    // Invalid: empty ID
    createTransition(null, createRootState("")),
    // Invalid: missing parent
    createTransition("NonExistent", createChildState("Orphan")),
    // More valid
    createTransition("A", createChildState("A", { version: 3 })),
  ];
}

/**
 * Create a mixed valid/invalid transition sequence.
 */
function createMixedTransitions(): Transition[] {
  return [
    createTransition(null, createRootState("Valid1")),
    createTransition(null, createRootState("")), // Invalid
    createTransition(null, createRootState("Valid2")),
    createTransition("Missing", createChildState("X")), // Invalid
    createTransition("Valid1", createChildState("Valid1", { v: 2 })),
  ];
}

// =============================================================================
// Replay Tests
// =============================================================================

describe("Transition Replay Engine (E.4)", () => {
  describe("Basic replay", () => {
    it("replays empty transition sequence", () => {
      const report = replay([], {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(report.total).toBe(0);
      expect(report.accepted).toBe(0);
      expect(report.rejected).toBe(0);
      expect(report.halted).toBe(0);
      expect(report.results).toEqual([]);
    });

    it("replays single valid transition", () => {
      const transitions = [createTransition(null, createRootState("Root"))];

      const report = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(report.total).toBe(1);
      expect(report.accepted).toBe(1);
      expect(report.rejected).toBe(0);
      expect(report.halted).toBe(0);
    });

    it("replays sequence with valid and invalid transitions", () => {
      const transitions = createMixedTransitions();

      const report = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(report.total).toBe(5);
      expect(report.accepted).toBe(3); // Valid1, Valid2, Valid1 v2
      expect(report.rejected).toBe(1); // Empty ID
      expect(report.halted).toBe(1); // Missing parent
    });

    it("provides per-transition results", () => {
      const transitions = createMixedTransitions();

      const report = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(report.results).toHaveLength(5);

      // First should be accepted
      expect(report.results[0].outcome).toBe("accepted");
      expect(report.results[0].index).toBe(0);

      // Second should be rejected (empty ID)
      expect(report.results[1].outcome).toBe("rejected");

      // Third should be accepted
      expect(report.results[2].outcome).toBe("accepted");

      // Fourth should be halted (missing parent)
      expect(report.results[3].outcome).toBe("halted");
    });
  });

  describe("Determinism", () => {
    it("same transitions produce same replay report", () => {
      const transitions = createTestTransitions();

      const report1 = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      const report2 = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(compareReplayReports(report1, report2)).toBe(true);
    });

    it("replay is independent of previous replays", () => {
      const transitions = createTestTransitions();

      // Run multiple replays
      const reports: ReplayReport[] = [];
      for (let i = 0; i < 5; i++) {
        reports.push(
          replay(transitions, {
            mode: "legacy",
            invariants: INITIAL_INVARIANTS,
          })
        );
      }

      // All should be identical
      for (let i = 1; i < reports.length; i++) {
        expect(compareReplayReports(reports[0], reports[i])).toBe(true);
      }
    });
  });

  describe("Live execution parity", () => {
    it("live execution equals replayed execution", () => {
      const transitions = createTestTransitions();
      const recorder = createTransitionRecorder();

      // Live execution
      const registrar = new StructuralRegistrar({ mode: "legacy" });
      for (const transition of transitions) {
        const result = registrar.register(transition);
        recorder.record(transition, result);
      }

      // Get live report
      const liveReport = recorder.toReport();

      // Replay
      const replayReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Should be identical
      expect(compareReplayReports(liveReport, replayReport)).toBe(true);
    });

    it("order indices match between live and replay", () => {
      const transitions = [
        createTransition(null, createRootState("A")),
        createTransition(null, createRootState("B")),
        createTransition(null, createRootState("C")),
      ];

      const recorder = createTransitionRecorder();
      const registrar = new StructuralRegistrar({ mode: "legacy" });

      for (const transition of transitions) {
        const result = registrar.register(transition);
        recorder.record(transition, result);
      }

      const liveReport = recorder.toReport();
      const replayReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Compare order indices
      for (let i = 0; i < transitions.length; i++) {
        const liveResult = liveReport.results[i].result;
        const replayResult = replayReport.results[i].result;

        expect(liveResult.kind).toBe(replayResult.kind);
        if (liveResult.kind === "accepted" && replayResult.kind === "accepted") {
          expect(liveResult.orderIndex).toBe(replayResult.orderIndex);
        }
      }
    });
  });

  describe("Mode parity", () => {
    it("legacy mode equals registry mode under replay", () => {
      const transitions = createTestTransitions();

      const legacyReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      const registryReport = replay(transitions, {
        mode: "registry",
        compiledRegistry: getCompiledRegistry(),
      });

      // Counts should match
      expect(legacyReport.total).toBe(registryReport.total);
      expect(legacyReport.accepted).toBe(registryReport.accepted);
      expect(legacyReport.rejected).toBe(registryReport.rejected);
      expect(legacyReport.halted).toBe(registryReport.halted);

      // Outcomes should match
      for (let i = 0; i < legacyReport.results.length; i++) {
        expect(legacyReport.results[i].outcome).toBe(
          registryReport.results[i].outcome
        );
      }
    });
  });

  describe("Rehydration + Replay", () => {
    it("replay after rehydration equals original run", () => {
      const transitions = createTestTransitions();

      // Original run
      const recorder = createTransitionRecorder();
      const original = new StructuralRegistrar({ mode: "legacy" });

      for (const transition of transitions) {
        const result = original.register(transition);
        recorder.record(transition, result);
      }

      const originalReport = recorder.toReport();

      // Snapshot and rehydrate
      const snapshot = original.snapshot();
      const rehydrated = StructuralRegistrar.fromSnapshot(snapshot, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Replay should match
      const replayReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(compareReplayReports(originalReport, replayReport)).toBe(true);
    });
  });

  describe("TransitionRecorder", () => {
    it("records transitions and results", () => {
      const recorder = createTransitionRecorder();
      const registrar = new StructuralRegistrar({ mode: "legacy" });

      const t1 = createTransition(null, createRootState("A"));
      const r1 = registrar.register(t1);
      recorder.record(t1, r1);

      const t2 = createTransition(null, createRootState("B"));
      const r2 = registrar.register(t2);
      recorder.record(t2, r2);

      expect(recorder.getTransitions()).toHaveLength(2);
      expect(recorder.getResults()).toHaveLength(2);
    });

    it("produces correct report", () => {
      const recorder = createTransitionRecorder();
      const registrar = new StructuralRegistrar({ mode: "legacy" });

      // Record some transitions
      const transitions = createMixedTransitions();
      for (const transition of transitions) {
        const result = registrar.register(transition);
        recorder.record(transition, result);
      }

      const report = recorder.toReport();

      expect(report.total).toBe(5);
      expect(report.results).toHaveLength(5);
    });
  });

  describe("Report comparison", () => {
    it("identical reports compare equal", () => {
      const transitions = createTestTransitions();

      const report1 = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      const report2 = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(compareReplayReports(report1, report2)).toBe(true);
    });

    it("different totals compare unequal", () => {
      const report1 = replay([createTransition(null, createRootState("A"))], {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      const report2 = replay(
        [
          createTransition(null, createRootState("A")),
          createTransition(null, createRootState("B")),
        ],
        {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        }
      );

      expect(compareReplayReports(report1, report2)).toBe(false);
    });

    it("different outcomes compare unequal", () => {
      // Create two different transition sequences with same length but different outcomes
      const valid = [
        createTransition(null, createRootState("A")),
        createTransition(null, createRootState("B")),
      ];

      const mixed = [
        createTransition(null, createRootState("A")),
        createTransition(null, createRootState("")), // Invalid
      ];

      const report1 = replay(valid, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      const report2 = replay(mixed, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(compareReplayReports(report1, report2)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("handles large transition sequence", () => {
      const transitions: Transition[] = [];
      for (let i = 0; i < 100; i++) {
        transitions.push(createTransition(null, createRootState(`State${i}`)));
      }

      const report = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(report.total).toBe(100);
      expect(report.accepted).toBe(100);
    });

    it("handles all-invalid sequence", () => {
      const transitions = [
        createTransition(null, createRootState("")),
        createTransition(null, createRootState("")),
        createTransition(null, createRootState("")),
      ];

      const report = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(report.accepted).toBe(0);
      expect(report.rejected).toBe(3);
    });

    it("handles sequence with all halt violations", () => {
      const transitions = [
        createTransition("Missing1", createChildState("A")),
        createTransition("Missing2", createChildState("B")),
      ];

      const report = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(report.accepted).toBe(0);
      expect(report.halted).toBe(2);
    });
  });
});
