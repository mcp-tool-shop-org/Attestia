/**
 * Registrum Registry Loader
 *
 * Loads and validates invariant registries from JSON.
 *
 * The loader is the constitutional gatekeeper:
 * - Validates registry schema
 * - Parses predicate expressions
 * - Performs static safety validation
 * - Rejects the entire registry if any invariant is unsafe
 *
 * Failure philosophy:
 * - Partial load is forbidden
 * - Runtime fallback is forbidden
 * - Best-effort parsing is forbidden
 * - If any invariant is invalid → hard failure
 */

import { RegistryError, InvariantDefinitionError } from "./errors.js";
import { parsePredicate, ParseError } from "./predicate/parser.js";
import { validatePredicate, ValidationError } from "./predicate/validator.js";
import type { ASTNode } from "./predicate/ast.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Raw invariant registry as loaded from JSON.
 */
export interface RawInvariantRegistry {
  readonly version: string;
  readonly registry_id: string;
  readonly status?: string;
  readonly invariants: readonly RawInvariantDefinition[];
}

/**
 * Raw invariant definition from JSON.
 */
export interface RawInvariantDefinition {
  readonly id: string;
  readonly group: string;
  readonly scope: string;
  readonly description: string;
  readonly applies_to: readonly string[];
  readonly condition: {
    readonly type: string;
    readonly expression: string;
  };
  readonly failure_mode: string;
}

/**
 * Validated and compiled invariant registry.
 */
export interface CompiledInvariantRegistry {
  readonly version: string;
  readonly registry_id: string;
  readonly status: string;
  readonly invariants: readonly CompiledInvariant[];
}

/**
 * Validated and compiled invariant.
 */
export interface CompiledInvariant {
  readonly id: string;
  readonly group: "identity" | "lineage" | "ordering";
  readonly scope: "state" | "transition" | "registration";
  readonly description: string;
  readonly applies_to: readonly string[];
  readonly ast: ASTNode;
  readonly failure_mode: "reject" | "halt";
}

// =============================================================================
// Loader
// =============================================================================

/**
 * Load and compile an invariant registry from raw JSON data.
 *
 * This function:
 * 1. Validates the registry schema
 * 2. Parses each predicate expression into an AST
 * 3. Validates each AST for safety
 * 4. Returns a compiled, immutable registry
 *
 * Throws on any validation error. Does not return partial results.
 */
export function loadInvariantRegistry(
  raw: unknown
): Readonly<CompiledInvariantRegistry> {
  // Step 1: Validate top-level schema
  const registry = validateRegistryShape(raw);

  // Step 2: Compile each invariant (parse + validate)
  const compiled: CompiledInvariant[] = [];
  const errors: string[] = [];

  for (const inv of registry.invariants) {
    try {
      const compiledInv = compileInvariant(inv);
      compiled.push(compiledInv);
    } catch (e) {
      if (
        e instanceof ParseError ||
        e instanceof ValidationError ||
        e instanceof InvariantDefinitionError
      ) {
        errors.push(`[${inv.id}] ${e.message}`);
      } else {
        throw e;
      }
    }
  }

  // Step 3: Fail if any invariants failed to compile
  if (errors.length > 0) {
    throw new RegistryError(
      `Registry contains invalid invariants:\n${errors.join("\n")}`
    );
  }

  // Step 4: Return frozen registry
  return Object.freeze({
    version: registry.version,
    registry_id: registry.registry_id,
    status: registry.status ?? "unknown",
    invariants: Object.freeze(compiled),
  });
}

// =============================================================================
// Schema Validation
// =============================================================================

/**
 * Validate the registry shape.
 */
function validateRegistryShape(raw: unknown): RawInvariantRegistry {
  if (typeof raw !== "object" || raw === null) {
    throw new RegistryError("Registry must be an object");
  }

  const r = raw as Record<string, unknown>;

  assertString(r["version"], "version");
  assertString(r["registry_id"], "registry_id");
  assertArray(r["invariants"], "invariants");

  const invariants = r["invariants"] as unknown[];
  for (let i = 0; i < invariants.length; i++) {
    validateInvariantShape(invariants[i], `invariants[${i}]`);
  }

  return r as unknown as RawInvariantRegistry;
}

/**
 * Validate an invariant definition shape.
 */
function validateInvariantShape(raw: unknown, path: string): void {
  if (typeof raw !== "object" || raw === null) {
    throw new RegistryError(`${path} must be an object`);
  }

  const inv = raw as Record<string, unknown>;

  assertString(inv["id"], `${path}.id`);
  assertOneOf(inv["group"], ["identity", "lineage", "ordering"], `${path}.group`);
  assertOneOf(
    inv["scope"],
    ["state", "transition", "registration"],
    `${path}.scope`
  );
  assertString(inv["description"], `${path}.description`);
  assertArray(inv["applies_to"], `${path}.applies_to`);
  assertOneOf(inv["failure_mode"], ["reject", "halt"], `${path}.failure_mode`);

  // Validate condition
  if (typeof inv["condition"] !== "object" || inv["condition"] === null) {
    throw new RegistryError(`${path}.condition must be an object`);
  }

  const cond = inv["condition"] as Record<string, unknown>;
  if (cond["type"] !== "predicate") {
    throw new RegistryError(`${path}.condition.type must be "predicate"`);
  }
  assertString(cond["expression"], `${path}.condition.expression`);
}

// =============================================================================
// Invariant Compilation
// =============================================================================

/**
 * Compile a single invariant definition.
 */
function compileInvariant(raw: RawInvariantDefinition): CompiledInvariant {
  // Parse the expression
  const ast = parsePredicate(raw.condition.expression);

  // Validate the AST for safety
  validatePredicate(ast);

  // Return compiled invariant
  return Object.freeze({
    id: raw.id,
    group: raw.group as "identity" | "lineage" | "ordering",
    scope: raw.scope as "state" | "transition" | "registration",
    description: raw.description,
    applies_to: Object.freeze([...raw.applies_to]),
    ast,
    failure_mode: raw.failure_mode as "reject" | "halt",
  });
}

// =============================================================================
// Assertion Helpers
// =============================================================================

function assertString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string") {
    throw new RegistryError(`${name} must be a string`);
  }
}

function assertArray(value: unknown, name: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new RegistryError(`${name} must be an array`);
  }
}

function assertOneOf(
  value: unknown,
  allowed: readonly string[],
  name: string
): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new RegistryError(
      `${name} must be one of: ${allowed.join(", ")}`
    );
  }
}
