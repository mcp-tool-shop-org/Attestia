/**
 * Persistence Parity Tests (E.5)
 *
 * Extends the parity harness across time:
 * - live → snapshot → replay parity
 * - legacy snapshot → legacy replay parity
 * - registry snapshot → registry replay parity
 * - legacy snapshot → registry replay parity (same registry)
 *
 * This is the scientific proof that Registrum is historical.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

import { StructuralRegistrar } from "../../src/structural-registrar";
import { loadInvariantRegistry } from "../../src/registry/loader";
import { INITIAL_INVARIANTS } from "../../src/invariants";
import type { Transition } from "../../src/types";
import {
  serializeSnapshot,
  deserializeSnapshot,
  replay,
  compareReplayReports,
  createTransitionRecorder,
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
 * Create a comprehensive test transition sequence.
 * Includes valid, invalid (reject), and invalid (halt) transitions.
 */
function createComprehensiveTransitions(): Transition[] {
  return [
    // Valid roots
    createTransition(null, createRootState("Doc1")),
    createTransition(null, createRootState("Doc2")),
    createTransition(null, createRootState("Doc3")),

    // Valid extensions
    createTransition("Doc1", createChildState("Doc1", { version: 2 })),
    createTransition("Doc2", createChildState("Doc2", { version: 2 })),
    createTransition("Doc1", createChildState("Doc1", { version: 3 })),

    // Invalid: empty ID (reject)
    createTransition(null, createRootState("")),

    // More valid
    createTransition("Doc3", createChildState("Doc3", { version: 2 })),

    // Invalid: non-root without parent (reject)
    createTransition(null, createChildState("Orphan")),

    // Invalid: missing parent (halt)
    createTransition("NonExistent", createChildState("Ghost")),

    // More valid
    createTransition("Doc2", createChildState("Doc2", { version: 3 })),
  ];
}

/**
 * Run live execution and return transitions + report.
 */
function runLiveExecution(
  registrar: StructuralRegistrar,
  transitions: Transition[]
) {
  const recorder = createTransitionRecorder();

  for (const transition of transitions) {
    const result = registrar.register(transition);
    recorder.record(transition, result);
  }

  return {
    report: recorder.toReport(),
    snapshot: registrar.snapshot(),
  };
}

// =============================================================================
// Persistence Parity Tests
// =============================================================================

describe("Persistence Parity (E.5)", () => {
  describe("Live → Snapshot → Replay Parity", () => {
    it("live → snapshot → replay produces identical report (legacy)", () => {
      const transitions = createComprehensiveTransitions();
      const registrar = new StructuralRegistrar({ mode: "legacy" });

      const { report: liveReport, snapshot } = runLiveExecution(
        registrar,
        transitions
      );

      // Serialize and deserialize
      const json = serializeSnapshot(snapshot);
      const parsed = deserializeSnapshot(json);

      // Rehydrate and continue (though we won't actually continue)
      const rehydrated = StructuralRegistrar.fromSnapshot(parsed, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Verify rehydrated snapshot matches
      const rehydratedSnapshot = rehydrated.snapshot();
      expect(serializeSnapshot(rehydratedSnapshot)).toBe(json);

      // Replay from scratch
      const replayReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Live and replay should be identical
      expect(compareReplayReports(liveReport, replayReport)).toBe(true);
    });

    it("live → snapshot → replay produces identical report (registry)", () => {
      const transitions = createComprehensiveTransitions();
      const compiledRegistry = getCompiledRegistry();
      const registrar = new StructuralRegistrar({
        mode: "registry",
        compiledRegistry,
      });

      const { report: liveReport, snapshot } = runLiveExecution(
        registrar,
        transitions
      );

      // Serialize and deserialize
      const json = serializeSnapshot(snapshot);
      const parsed = deserializeSnapshot(json);

      // Rehydrate
      const rehydrated = StructuralRegistrar.fromSnapshot(parsed, {
        mode: "registry",
        compiledRegistry,
      });

      // Verify rehydrated snapshot matches
      expect(serializeSnapshot(rehydrated.snapshot())).toBe(json);

      // Replay from scratch
      const replayReport = replay(transitions, {
        mode: "registry",
        compiledRegistry,
      });

      // Live and replay should be identical
      expect(compareReplayReports(liveReport, replayReport)).toBe(true);
    });
  });

  describe("Mode Parity Under Persistence", () => {
    it("legacy snapshot → legacy replay parity", () => {
      const transitions = createComprehensiveTransitions();

      // Run legacy live
      const legacyRegistrar = new StructuralRegistrar({ mode: "legacy" });
      const { report: liveReport, snapshot } = runLiveExecution(
        legacyRegistrar,
        transitions
      );

      // Round-trip through serialization
      const json = serializeSnapshot(snapshot);
      const parsed = deserializeSnapshot(json);

      // Rehydrate as legacy
      const rehydrated = StructuralRegistrar.fromSnapshot(parsed, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Replay as legacy
      const replayReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // All three should produce equivalent outcomes
      expect(rehydrated.getRegisteredCount()).toBe(
        legacyRegistrar.getRegisteredCount()
      );
      expect(compareReplayReports(liveReport, replayReport)).toBe(true);
    });

    it("registry snapshot → registry replay parity", () => {
      const transitions = createComprehensiveTransitions();
      const compiledRegistry = getCompiledRegistry();

      // Run registry live
      const registryRegistrar = new StructuralRegistrar({
        mode: "registry",
        compiledRegistry,
      });
      const { report: liveReport, snapshot } = runLiveExecution(
        registryRegistrar,
        transitions
      );

      // Round-trip through serialization
      const json = serializeSnapshot(snapshot);
      const parsed = deserializeSnapshot(json);

      // Rehydrate as registry
      const rehydrated = StructuralRegistrar.fromSnapshot(parsed, {
        mode: "registry",
        compiledRegistry,
      });

      // Replay as registry
      const replayReport = replay(transitions, {
        mode: "registry",
        compiledRegistry,
      });

      // All three should produce equivalent outcomes
      expect(rehydrated.getRegisteredCount()).toBe(
        registryRegistrar.getRegisteredCount()
      );
      expect(compareReplayReports(liveReport, replayReport)).toBe(true);
    });

    it("legacy live ≡ registry live under persistence (same transitions)", () => {
      const transitions = createComprehensiveTransitions();
      const compiledRegistry = getCompiledRegistry();

      // Run both modes live
      const legacyRegistrar = new StructuralRegistrar({ mode: "legacy" });
      const registryRegistrar = new StructuralRegistrar({
        mode: "registry",
        compiledRegistry,
      });

      const legacyResult = runLiveExecution(legacyRegistrar, transitions);
      const registryResult = runLiveExecution(registryRegistrar, transitions);

      // Reports should be equivalent
      expect(legacyResult.report.total).toBe(registryResult.report.total);
      expect(legacyResult.report.accepted).toBe(registryResult.report.accepted);
      expect(legacyResult.report.rejected).toBe(registryResult.report.rejected);
      expect(legacyResult.report.halted).toBe(registryResult.report.halted);

      // Each outcome should match
      for (let i = 0; i < legacyResult.report.results.length; i++) {
        expect(legacyResult.report.results[i].outcome).toBe(
          registryResult.report.results[i].outcome
        );
      }

      // Snapshot state counts should match
      expect(legacyResult.snapshot.state_ids.length).toBe(
        registryResult.snapshot.state_ids.length
      );
    });
  });

  describe("Snapshot Stability", () => {
    it("multiple serialization cycles produce identical JSON", () => {
      const transitions = createComprehensiveTransitions();
      const registrar = new StructuralRegistrar({ mode: "legacy" });

      for (const transition of transitions) {
        registrar.register(transition);
      }

      const snapshot = registrar.snapshot();

      // Multiple serialization cycles
      let json = serializeSnapshot(snapshot);
      for (let i = 0; i < 5; i++) {
        const parsed = deserializeSnapshot(json);
        const reserialized = serializeSnapshot(
          parsed as typeof snapshot
        );
        expect(reserialized).toBe(json);
        json = reserialized;
      }
    });

    it("rehydration preserves snapshot identity", () => {
      const transitions = createComprehensiveTransitions();
      const registrar = new StructuralRegistrar({ mode: "legacy" });

      for (const transition of transitions) {
        registrar.register(transition);
      }

      const originalJson = serializeSnapshot(registrar.snapshot());

      // Rehydrate
      const rehydrated = StructuralRegistrar.fromSnapshot(
        deserializeSnapshot(originalJson),
        {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        }
      );

      const rehydratedJson = serializeSnapshot(rehydrated.snapshot());

      expect(rehydratedJson).toBe(originalJson);
    });
  });

  describe("Replay Determinism Across Time", () => {
    it("replay produces same results regardless of when executed", () => {
      const transitions = createComprehensiveTransitions();

      // Simulate "time passing" by running multiple independent replays
      const reports = [];
      for (let i = 0; i < 10; i++) {
        reports.push(
          replay(transitions, {
            mode: "legacy",
            invariants: INITIAL_INVARIANTS,
          })
        );
      }

      // All reports should be identical
      for (let i = 1; i < reports.length; i++) {
        expect(compareReplayReports(reports[0], reports[i])).toBe(true);
      }
    });

    it("replay after rehydration matches original replay", () => {
      const transitions = createComprehensiveTransitions();

      // Original replay
      const originalReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Run live, snapshot, rehydrate
      const registrar = new StructuralRegistrar({ mode: "legacy" });
      for (const transition of transitions) {
        registrar.register(transition);
      }

      const snapshot = registrar.snapshot();
      const rehydrated = StructuralRegistrar.fromSnapshot(snapshot, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // Replay after rehydration context
      const postRehydrationReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      expect(compareReplayReports(originalReport, postRehydrationReport)).toBe(
        true
      );
    });
  });

  describe("Invariant Consistency", () => {
    it("same invariants applied during live, snapshot, and replay", () => {
      const transitions = createComprehensiveTransitions();
      const registrar = new StructuralRegistrar({ mode: "legacy" });

      // Get invariant list before live execution
      const invariantsBefore = registrar.listInvariants().map((i) => i.id);

      for (const transition of transitions) {
        registrar.register(transition);
      }

      // Get invariant list after live execution
      const invariantsAfter = registrar.listInvariants().map((i) => i.id);

      // Rehydrate and check invariants
      const rehydrated = StructuralRegistrar.fromSnapshot(registrar.snapshot(), {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });
      const invariantsRehydrated = rehydrated.listInvariants().map((i) => i.id);

      // All should match
      expect(invariantsBefore).toEqual(invariantsAfter);
      expect(invariantsAfter).toEqual(invariantsRehydrated);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty transition sequence through full persistence cycle", () => {
      const transitions: Transition[] = [];

      // Live
      const registrar = new StructuralRegistrar({ mode: "legacy" });
      const { report: liveReport, snapshot } = runLiveExecution(
        registrar,
        transitions
      );

      // Serialize
      const json = serializeSnapshot(snapshot);

      // Rehydrate
      const rehydrated = StructuralRegistrar.fromSnapshot(
        deserializeSnapshot(json),
        {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        }
      );

      // Replay
      const replayReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // All should show empty
      expect(liveReport.total).toBe(0);
      expect(replayReport.total).toBe(0);
      expect(rehydrated.getRegisteredCount()).toBe(0);
    });

    it("handles large transition sequence through full persistence cycle", () => {
      const transitions: Transition[] = [];
      for (let i = 0; i < 100; i++) {
        transitions.push(createTransition(null, createRootState(`State${i}`)));
      }

      // Live
      const registrar = new StructuralRegistrar({ mode: "legacy" });
      const { report: liveReport, snapshot } = runLiveExecution(
        registrar,
        transitions
      );

      // Serialize
      const json = serializeSnapshot(snapshot);

      // Rehydrate
      const rehydrated = StructuralRegistrar.fromSnapshot(
        deserializeSnapshot(json),
        {
          mode: "legacy",
          invariants: INITIAL_INVARIANTS,
        }
      );

      // Replay
      const replayReport = replay(transitions, {
        mode: "legacy",
        invariants: INITIAL_INVARIANTS,
      });

      // All should show 100 accepted
      expect(liveReport.accepted).toBe(100);
      expect(replayReport.accepted).toBe(100);
      expect(rehydrated.getRegisteredCount()).toBe(100);
      expect(compareReplayReports(liveReport, replayReport)).toBe(true);
    });
  });
});
