/**
 * Registrum Registrar Interface
 *
 * The Registrar is the constitutional component that validates and orders State Transitions.
 *
 * Design rules:
 * - All methods are pure with respect to content
 * - No method may mutate State directly
 * - No method may adapt behavior over time
 * - No hidden state affecting outcomes
 * - Determinism is mandatory
 *
 * Explicit non-capabilities (forbidden):
 * - Scoring APIs
 * - Ranking APIs
 * - Callbacks
 * - Hooks that mutate behavior
 * - Retry logic
 * - Policy selection
 * - update()
 * - delete()
 * - optimize()
 * - score()
 * - suggest()
 * - onFailure()
 * - onAccept()
 */

import type {
  Transition,
  State,
  RegistrationResult,
  ValidationReport,
  InvariantDescriptor,
  InvariantScope,
  LineageTrace,
  StateID,
  InvariantInput,
} from "./types.js";

/**
 * The Registrar interface.
 *
 * Constitutional authority over state transitions.
 * Exposes exactly four capabilities:
 * 1. register - Accept or reject transitions
 * 2. validate - Inspect without registering
 * 3. listInvariants - Expose all active invariants
 * 4. getLineage - Trace state ancestry
 */
export interface Registrar {
  /**
   * Register a proposed Transition.
   *
   * Behavior:
   * - Validates transition against all applicable invariants
   * - Enforces ordering rules
   * - Produces a deterministic outcome
   *
   * Returns:
   * - Acceptance with stateId, orderIndex, and appliedInvariants
   * - Rejection with all violations
   *
   * Guarantees:
   * - Same inputs → same outputs (determinism)
   * - No mutation of input
   * - No side effects beyond internal state tracking
   */
  register(transition: Transition): RegistrationResult;

  /**
   * Validate a State or Transition without registering it.
   *
   * Used for:
   * - Inspection
   * - Testing
   * - Diagnostics
   *
   * Must not:
   * - Modify system state
   * - Cache or adapt behavior
   */
  validate(target: State | Transition): ValidationReport;

  /**
   * Return active invariants, optionally filtered by scope.
   *
   * Purpose:
   * - Inspectability
   * - Auditability
   * - Scientific transparency
   * - External tool integration (read-only)
   *
   * Returns descriptors (without predicates) for safe serialization.
   *
   * @param scope - Optional filter to return only invariants of a specific scope
   */
  listInvariants(scope?: InvariantScope): readonly InvariantDescriptor[];

  /**
   * Return the traceable ancestry of a State.
   *
   * This is read-only and must not infer meaning.
   * Returns StateIDs from most recent ancestor to root.
   */
  getLineage(stateId: StateID): LineageTrace;
}

/**
 * Type guard to check if input is a State.
 */
export function isState(target: State | Transition): target is State {
  return "id" in target && "structure" in target && !("from" in target);
}

/**
 * Type guard to check if input is a Transition.
 */
export function isTransition(target: State | Transition): target is Transition {
  return "from" in target && "to" in target;
}

/**
 * Convert a State or Transition to InvariantInput for predicate evaluation.
 */
export function toInvariantInput(
  target: State | Transition,
  registeredStateIds: ReadonlySet<StateID>,
  currentOrderIndex: number
): InvariantInput {
  if (isState(target)) {
    return { kind: "state", state: target };
  }
  return {
    kind: "registration",
    transition: target,
    registeredStateIds,
    currentOrderIndex,
  };
}
