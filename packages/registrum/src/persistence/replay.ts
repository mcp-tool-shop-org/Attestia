/**
 * Transition Replay Engine (E.4)
 *
 * Replays history without mutating it, proving determinism over time.
 *
 * Design rules:
 * - Read-only: Never mutates snapshot
 * - Never persists new state
 * - Evaluates invariants again to prove determinism
 * - Divergence is forbidden (indicates a bug)
 */

import type { Transition, RegistrationResult, Invariant } from "../types.js";
import { StructuralRegistrar, type RegistrarMode } from "../structural-registrar.js";
import type { CompiledInvariantRegistry } from "../registry/loader.js";

// =============================================================================
// Replay Report
// =============================================================================

/**
 * Report from replaying a sequence of transitions.
 *
 * Note: divergence is always undefined (divergence is forbidden).
 * If replay diverges from expected, it's a bug in the system.
 */
export interface ReplayReport {
  /**
   * Total number of transitions replayed.
   */
  readonly total: number;

  /**
   * Number of transitions accepted.
   */
  readonly accepted: number;

  /**
   * Number of transitions rejected.
   */
  readonly rejected: number;

  /**
   * Number of transitions that caused halt.
   */
  readonly halted: number;

  /**
   * Per-transition results (for detailed analysis).
   */
  readonly results: readonly ReplayResult[];

  /**
   * Divergence is always undefined.
   * Its presence in the type serves as documentation:
   * divergence is structurally forbidden.
   */
  readonly divergence?: never;
}

/**
 * Result of replaying a single transition.
 */
export interface ReplayResult {
  /**
   * Index of this transition in the replay sequence.
   */
  readonly index: number;

  /**
   * The transition that was replayed.
   */
  readonly transition: Transition;

  /**
   * The registration result.
   */
  readonly result: RegistrationResult;

  /**
   * Outcome classification.
   */
  readonly outcome: "accepted" | "rejected" | "halted";
}

// =============================================================================
// Replay Options
// =============================================================================

/**
 * Options for replay execution.
 */
export interface ReplayOptions {
  /**
   * Operating mode for replay.
   */
  readonly mode: RegistrarMode;

  /**
   * Legacy invariants (required for legacy mode).
   */
  readonly invariants?: readonly Invariant[];

  /**
   * Compiled registry (required for registry mode).
   */
  readonly compiledRegistry?: CompiledInvariantRegistry;
}

// =============================================================================
// Replay Engine
// =============================================================================

/**
 * Replay a sequence of transitions.
 *
 * This function:
 * 1. Creates a fresh registrar
 * 2. Replays each transition in order
 * 3. Records all outcomes
 * 4. Returns a comprehensive report
 *
 * Properties:
 * - Read-only: The input transitions are never modified
 * - Deterministic: Same inputs always produce same outputs
 * - Fresh: Each replay starts from empty state
 *
 * @param transitions - Sequence of transitions to replay
 * @param options - Replay configuration (mode, invariants, etc.)
 * @returns Complete replay report
 */
export function replay(
  transitions: readonly Transition[],
  options: ReplayOptions
): ReplayReport {
  // Create fresh registrar for replay
  const registrar = new StructuralRegistrar({
    mode: options.mode,
    ...(options.invariants !== undefined ? { invariants: options.invariants } : {}),
    ...(options.compiledRegistry !== undefined ? { compiledRegistry: options.compiledRegistry } : {}),
  });

  // Track results
  const results: ReplayResult[] = [];
  let accepted = 0;
  let rejected = 0;
  let halted = 0;

  // Replay each transition
  for (let i = 0; i < transitions.length; i++) {
    const transition = transitions[i]!;
    const result = registrar.register(transition);

    // Classify outcome
    let outcome: "accepted" | "rejected" | "halted";
    if (result.kind === "accepted") {
      outcome = "accepted";
      accepted++;
    } else {
      // Check for halt
      const hasHalt = result.violations.some((v) =>
        v.message.includes("[HALT]")
      );
      if (hasHalt) {
        outcome = "halted";
        halted++;
      } else {
        outcome = "rejected";
        rejected++;
      }
    }

    results.push({
      index: i,
      transition,
      result,
      outcome,
    });
  }

  return {
    total: transitions.length,
    accepted,
    rejected,
    halted,
    results,
  };
}

/**
 * Compare two replay reports for equality.
 *
 * Two reports are equal if:
 * - Same total count
 * - Same accepted/rejected/halted counts
 * - Each result has same outcome at same index
 *
 * This is used to verify that live execution matches replayed execution.
 *
 * @param report1 - First replay report
 * @param report2 - Second replay report
 * @returns True if reports are equivalent
 */
export function compareReplayReports(
  report1: ReplayReport,
  report2: ReplayReport
): boolean {
  // Check counts
  if (report1.total !== report2.total) return false;
  if (report1.accepted !== report2.accepted) return false;
  if (report1.rejected !== report2.rejected) return false;
  if (report1.halted !== report2.halted) return false;

  // Check per-result outcomes
  for (let i = 0; i < report1.results.length; i++) {
    const r1 = report1.results[i]!;
    const r2 = report2.results[i]!;

    if (r1.outcome !== r2.outcome) return false;

    // For accepted results, check order index
    if (r1.result.kind === "accepted" && r2.result.kind === "accepted") {
      if (r1.result.orderIndex !== r2.result.orderIndex) return false;
    }

    // For rejected results, check invariant IDs
    if (r1.result.kind === "rejected" && r2.result.kind === "rejected") {
      const ids1 = r1.result.violations.map((v: { invariantId: string }) => v.invariantId).sort();
      const ids2 = r2.result.violations.map((v: { invariantId: string }) => v.invariantId).sort();
      if (ids1.join(",") !== ids2.join(",")) return false;
    }
  }

  return true;
}

/**
 * Extract transitions from a live registrar's history.
 *
 * Note: This requires access to the registrar's internal state.
 * In production, transitions should be recorded during registration.
 *
 * This is a utility for testing only.
 */
export type TransitionRecorder = {
  /**
   * Record a transition during registration.
   */
  record(transition: Transition, result: RegistrationResult): void;

  /**
   * Get all recorded transitions.
   */
  getTransitions(): readonly Transition[];

  /**
   * Get all recorded results.
   */
  getResults(): readonly RegistrationResult[];

  /**
   * Build a replay report from recorded data.
   */
  toReport(): ReplayReport;
};

/**
 * Create a transition recorder for tracking live registrations.
 */
export function createTransitionRecorder(): TransitionRecorder {
  const transitions: Transition[] = [];
  const results: RegistrationResult[] = [];

  return {
    record(transition: Transition, result: RegistrationResult): void {
      transitions.push(transition);
      results.push(result);
    },

    getTransitions(): readonly Transition[] {
      return transitions;
    },

    getResults(): readonly RegistrationResult[] {
      return results;
    },

    toReport(): ReplayReport {
      let accepted = 0;
      let rejected = 0;
      let halted = 0;

      const replayResults: ReplayResult[] = results.map((result, i) => {
        let outcome: "accepted" | "rejected" | "halted";

        if (result.kind === "accepted") {
          outcome = "accepted";
          accepted++;
        } else {
          const hasHalt = result.violations.some((v) =>
            v.message.includes("[HALT]")
          );
          if (hasHalt) {
            outcome = "halted";
            halted++;
          } else {
            outcome = "rejected";
            rejected++;
          }
        }

        return {
          index: i,
          transition: transitions[i]!,
          result,
          outcome,
        };
      });

      return {
        total: transitions.length,
        accepted,
        rejected,
        halted,
        results: replayResults,
      };
    },
  };
}
