/**
 * Registrum Registry System
 *
 * Experimental parallel infrastructure for declarative invariant registration.
 *
 * Status: EXPERIMENTAL — structural parity target with src/invariants.ts
 *
 * This system provides:
 * - Machine-readable invariant registry (JSON)
 * - Safe predicate expression DSL
 * - Static safety validation
 * - Compiled AST evaluation
 *
 * Migration path:
 * - Phase A: Parallel introduction (current)
 * - Phase B: Parity harness (compare old vs new)
 * - Phase C: Cutover decision (replace or abort)
 */

// Loader
export {
  loadInvariantRegistry,
} from "./loader.js";
export type {
  RawInvariantRegistry,
  RawInvariantDefinition,
  CompiledInvariantRegistry,
  CompiledInvariant,
} from "./loader.js";

// Registry-Driven Registrar
export { RegistryDrivenRegistrar } from "./registry-driven-registrar.js";

// Errors
export {
  RegistryError,
  InvariantDefinitionError,
} from "./errors.js";

// Predicate DSL (re-export)
export * from "./predicate/index.js";
