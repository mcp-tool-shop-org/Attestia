/**
 * Registrum — A structural registrar for maintaining legibility in evolving systems.
 *
 * This is the public API surface for Registrum Phase 1.
 *
 * Exports:
 * - Types (State, Transition, RegistrationResult, etc.)
 * - Registrar interface
 * - StructuralRegistrar implementation
 * - Initial invariants
 * - Version constant
 */

// Version (single authoritative source)
export { REGISTRUM_VERSION } from "./version.js";

// Core types
export type {
  StateID,
  State,
  Transition,
  InvariantScope,
  FailureMode,
  InvariantInput,
  Invariant,
  ViolationClassification,
  InvariantViolation,
  RegistrationResult,
  ValidationReport,
  InvariantDescriptor,
  LineageTrace,
} from "./types.js";

// Registrar interface and helpers
export type { Registrar } from "./registrar.js";
export { isState, isTransition, toInvariantInput } from "./registrar.js";

// Implementation
export { StructuralRegistrar } from "./structural-registrar.js";

// Invariants
export {
  INITIAL_INVARIANTS,
  getInvariantsByScope,
  getInvariantById,
  // Individual invariants for extension/testing
  identityImmutableInvariant,
  identityExplicitInvariant,
  identityUniqueInvariant,
  lineageExplicitInvariant,
  lineageParentExistsInvariant,
  lineageSingleParentInvariant,
  lineageContinuousInvariant,
  orderingTotalInvariant,
  orderingDeterministicInvariant,
  orderingMonotonicInvariant,
  orderingNonSemanticInvariant,
} from "./invariants.js";
