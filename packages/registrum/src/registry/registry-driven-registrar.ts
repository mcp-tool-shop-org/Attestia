/**
 * Registry-Driven Registrar
 *
 * A Registrar implementation that evaluates invariants from the compiled
 * registry system (JSON + DSL) rather than TypeScript predicates.
 *
 * Status: EXPERIMENTAL — for parity testing only
 *
 * This class mirrors StructuralRegistrar's behavior but uses:
 * - CompiledInvariantRegistry for invariant definitions
 * - Predicate AST evaluation instead of TS functions
 *
 * Purpose:
 * - Enable behavioral comparison between old and new systems
 * - Prove that registry-based evaluation is equivalent
 * - Surface any divergence explicitly
 */

import type {
  State,
  Transition,
  RegistrationResult,
  ValidationReport,
  InvariantDescriptor,
  InvariantScope,
  LineageTrace,
  StateID,
  InvariantViolation,
} from "../types.js";
import type { Registrar } from "../registrar.js";
import { isState, isTransition } from "../registrar.js";
import type { CompiledInvariantRegistry, CompiledInvariant } from "./loader.js";
import { evaluatePredicate } from "./predicate/evaluator.js";
import type { EvaluationContext } from "./predicate/evaluator.js";

/**
 * Internal state entry for a registered state.
 */
interface RegisteredState {
  readonly id: StateID;
  readonly parentId: StateID | null;
  readonly orderIndex: number;
}

/**
 * RegistryDrivenRegistrar — Experimental Registrar using compiled registry.
 *
 * This class implements the same Registrar interface as StructuralRegistrar
 * but derives its invariant logic from the compiled registry system.
 */
export class RegistryDrivenRegistrar implements Registrar {
  /**
   * Registry of all accepted states.
   */
  private readonly registry: Map<StateID, RegisteredState> = new Map();

  /**
   * Current order index (monotonically increasing).
   */
  private currentOrderIndex: number = 0;

  /**
   * Compiled invariant registry.
   */
  private readonly invariantRegistry: CompiledInvariantRegistry;

  constructor(invariantRegistry: CompiledInvariantRegistry) {
    this.invariantRegistry = invariantRegistry;
  }

  /**
   * Register a proposed Transition.
   */
  register(transition: Transition): RegistrationResult {
    const violations: InvariantViolation[] = [];
    const appliedInvariants: string[] = [];
    let shouldHalt = false;

    // Build evaluation context
    const context = this.buildEvaluationContext(transition);

    // Evaluate all invariants
    for (const invariant of this.invariantRegistry.invariants) {
      appliedInvariants.push(invariant.id);

      // Check if invariant applies to this scope
      if (!this.invariantApplies(invariant, transition)) {
        continue;
      }

      // Evaluate the predicate AST
      const passed = evaluatePredicate(invariant.ast, context);

      if (!passed) {
        const classification = invariant.failure_mode === "halt" ? "HALT" : "REJECT";
        violations.push({
          invariantId: invariant.id,
          classification,
          message: `Invariant violation: ${invariant.description}`,
        });

        if (invariant.failure_mode === "halt") {
          shouldHalt = true;
        }
      }
    }

    // If any violations, reject
    if (violations.length > 0) {
      if (shouldHalt) {
        const haltViolations = violations.map((v) => {
          if (v.classification === "HALT") {
            return {
              ...v,
              message: `[HALT] ${v.message}`,
            };
          }
          return v;
        });

        return {
          kind: "rejected",
          violations: haltViolations,
        };
      }

      return {
        kind: "rejected",
        violations,
      };
    }

    // All invariants passed — register the state
    const orderIndex = this.currentOrderIndex;
    this.currentOrderIndex += 1;

    const registeredState: RegisteredState = {
      id: transition.to.id,
      parentId: transition.from,
      orderIndex,
    };

    this.registry.set(transition.to.id, registeredState);

    return {
      kind: "accepted",
      stateId: transition.to.id,
      orderIndex,
      appliedInvariants,
    };
  }

  /**
   * Validate a State or Transition without registering it.
   */
  validate(target: State | Transition): ValidationReport {
    const violations: InvariantViolation[] = [];

    if (isState(target)) {
      const context = this.buildStateValidationContext(target);

      for (const invariant of this.invariantRegistry.invariants) {
        if (invariant.scope !== "state") continue;

        const passed = evaluatePredicate(invariant.ast, context);
        if (!passed) {
          violations.push({
            invariantId: invariant.id,
            classification: invariant.failure_mode === "halt" ? "HALT" : "REJECT",
            message: `Invariant violation: ${invariant.description}`,
          });
        }
      }
    } else if (isTransition(target)) {
      const context = this.buildTransitionValidationContext(target);

      for (const invariant of this.invariantRegistry.invariants) {
        if (invariant.scope !== "state" && invariant.scope !== "transition") {
          continue;
        }

        const passed = evaluatePredicate(invariant.ast, context);
        if (!passed) {
          violations.push({
            invariantId: invariant.id,
            classification: invariant.failure_mode === "halt" ? "HALT" : "REJECT",
            message: `Invariant violation: ${invariant.description}`,
          });
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Return active invariants, optionally filtered by scope.
   *
   * @param scope - Optional filter to return only invariants of a specific scope
   */
  listInvariants(scope?: InvariantScope): readonly InvariantDescriptor[] {
    const invariants = this.invariantRegistry.invariants;
    const filtered = scope
      ? invariants.filter((inv) => inv.scope === scope)
      : invariants;

    return filtered.map((inv) => ({
      id: inv.id,
      scope: inv.scope,
      appliesTo: inv.applies_to,
      failureMode: inv.failure_mode,
      description: inv.description,
    }));
  }

  /**
   * Return the traceable ancestry of a State.
   */
  getLineage(stateId: StateID): LineageTrace {
    const lineage: StateID[] = [];
    let currentId: StateID | null = stateId;
    const visited = new Set<StateID>();

    while (currentId !== null) {
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const entry = this.registry.get(currentId);
      if (!entry) {
        break;
      }

      lineage.push(currentId);
      currentId = entry.parentId;
    }

    return lineage;
  }

  // =========================================================================
  // Internal helpers
  // =========================================================================

  /**
   * Check if an invariant applies given the current context.
   */
  private invariantApplies(
    _invariant: CompiledInvariant,
    _transition: Transition
  ): boolean {
    // All invariants are evaluated during registration
    // Scope filtering happens in the context building
    return true;
  }

  /**
   * Build evaluation context for registration.
   */
  private buildEvaluationContext(transition: Transition): EvaluationContext {
    return {
      state: {
        id: transition.to.id,
        structure: transition.to.structure as Record<string, unknown>,
      },
      transition: {
        from: transition.from,
        to: {
          id: transition.to.id,
          structure: transition.to.structure as Record<string, unknown>,
        },
      },
      registry: {
        contains_state: (id: StateID | null) =>
          id !== null && this.registry.has(id),
        max_order_index: () => this.currentOrderIndex - 1,
        compute_order_index: () => this.currentOrderIndex,
      },
      ordering: {
        index: this.currentOrderIndex,
      },
    };
  }

  /**
   * Build evaluation context for state validation.
   */
  private buildStateValidationContext(state: State): EvaluationContext {
    return {
      state: {
        id: state.id,
        structure: state.structure as Record<string, unknown>,
      },
      transition: {
        from: null,
        to: {
          id: state.id,
          structure: state.structure as Record<string, unknown>,
        },
      },
      registry: {
        contains_state: (id: StateID | null) =>
          id !== null && this.registry.has(id),
        max_order_index: () => this.currentOrderIndex - 1,
        compute_order_index: () => this.currentOrderIndex,
      },
      ordering: null,
    };
  }

  /**
   * Build evaluation context for transition validation.
   */
  private buildTransitionValidationContext(
    transition: Transition
  ): EvaluationContext {
    return {
      state: {
        id: transition.to.id,
        structure: transition.to.structure as Record<string, unknown>,
      },
      transition: {
        from: transition.from,
        to: {
          id: transition.to.id,
          structure: transition.to.structure as Record<string, unknown>,
        },
      },
      registry: {
        contains_state: (id: StateID | null) =>
          id !== null && this.registry.has(id),
        max_order_index: () => this.currentOrderIndex - 1,
        compute_order_index: () => this.currentOrderIndex,
      },
      ordering: null,
    };
  }

  // =========================================================================
  // Testing helpers
  // =========================================================================

  getRegisteredCount(): number {
    return this.registry.size;
  }

  isRegistered(stateId: StateID): boolean {
    return this.registry.has(stateId);
  }

  getCurrentOrderIndex(): number {
    return this.currentOrderIndex;
  }
}
