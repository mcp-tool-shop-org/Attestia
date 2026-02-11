/**
 * Registrum Predicate Evaluator
 *
 * Evaluates validated predicate ASTs against a context.
 *
 * Design constraints:
 * - Pure evaluation (no side effects)
 * - No caching
 * - No mutation of context
 * - Fails closed (errors become false)
 */

import type { ASTNode } from "./ast.js";
import type { StateID } from "../../types.js";

/**
 * Evaluation context provided to predicates.
 */
export interface EvaluationContext {
  /** Current state being evaluated (transition.to) */
  readonly state: {
    readonly id: StateID;
    readonly structure: Readonly<Record<string, unknown>>;
  };

  /** Current transition being evaluated */
  readonly transition: {
    readonly from: StateID | null;
    readonly to: {
      readonly id: StateID;
      readonly structure: Readonly<Record<string, unknown>>;
    };
  };

  /** Registry context (read-only view) */
  readonly registry: {
    readonly contains_state: (id: StateID | null) => boolean;
    readonly max_order_index: () => number;
    readonly compute_order_index: (transition: unknown) => number;
  };

  /** Ordering context (for registration-scope invariants) */
  readonly ordering: {
    readonly index: number;
  } | null;
}

/**
 * Evaluation error class.
 */
export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationError";
  }
}

/**
 * Evaluate a predicate AST against a context.
 * Returns boolean result.
 */
export function evaluatePredicate(
  ast: ASTNode,
  context: EvaluationContext
): boolean {
  try {
    const result = evaluate(ast, context);
    return toBoolean(result);
  } catch (e) {
    // Fail closed: errors become false
    if (e instanceof EvaluationError) {
      return false;
    }
    throw e;
  }
}

/**
 * Internal evaluation function.
 * Returns the raw value (not necessarily boolean).
 */
function evaluate(node: ASTNode, context: EvaluationContext): unknown {
  switch (node.kind) {
    case "Literal":
      return node.value;

    case "Identifier":
      return resolveIdentifier(node.path, context);

    case "Binary":
      return evaluateBinary(node.op, node.left, node.right, context);

    case "Unary":
      return evaluateUnary(node.op, node.operand, context);

    case "Call":
      return evaluateCall(node.fn, node.args, context);

    default:
      const _exhaustive: never = node;
      throw new EvaluationError(`Unknown node kind: ${(_exhaustive as ASTNode).kind}`);
  }
}

/**
 * Resolve an identifier path in the context.
 */
function resolveIdentifier(
  path: readonly string[],
  context: EvaluationContext
): unknown {
  if (path.length === 0) {
    throw new EvaluationError("Empty identifier path");
  }

  const root = path[0]!;
  let value: unknown;

  switch (root) {
    case "state":
      value = context.state;
      break;
    case "transition":
      value = context.transition;
      break;
    case "registry":
      value = context.registry;
      break;
    case "ordering":
      value = context.ordering;
      break;
    case "true":
      return true;
    case "false":
      return false;
    case "null":
      return null;
    default:
      throw new EvaluationError(`Unknown root identifier: ${root}`);
  }

  // Traverse the path
  for (let i = 1; i < path.length; i++) {
    const key = path[i]!;
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value !== "object") {
      throw new EvaluationError(
        `Cannot access property '${key}' of non-object`
      );
    }
    value = (value as Record<string, unknown>)[key];
  }

  return value;
}

/**
 * Evaluate a binary operation.
 */
function evaluateBinary(
  op: string,
  left: ASTNode,
  right: ASTNode,
  context: EvaluationContext
): unknown {
  // Short-circuit evaluation for && and ||
  if (op === "&&") {
    const leftVal = toBoolean(evaluate(left, context));
    if (!leftVal) return false;
    return toBoolean(evaluate(right, context));
  }

  if (op === "||") {
    const leftVal = toBoolean(evaluate(left, context));
    if (leftVal) return true;
    return toBoolean(evaluate(right, context));
  }

  // Eager evaluation for other operators
  const leftVal = evaluate(left, context);
  const rightVal = evaluate(right, context);

  switch (op) {
    case "==":
      return strictEquals(leftVal, rightVal);
    case "!=":
      return !strictEquals(leftVal, rightVal);
    case ">":
      return compareNumbers(leftVal, rightVal, (a, b) => a > b);
    case "<":
      return compareNumbers(leftVal, rightVal, (a, b) => a < b);
    case ">=":
      return compareNumbers(leftVal, rightVal, (a, b) => a >= b);
    case "<=":
      return compareNumbers(leftVal, rightVal, (a, b) => a <= b);
    default:
      throw new EvaluationError(`Unknown binary operator: ${op}`);
  }
}

/**
 * Evaluate a unary operation.
 */
function evaluateUnary(
  op: string,
  operand: ASTNode,
  context: EvaluationContext
): unknown {
  const val = evaluate(operand, context);

  switch (op) {
    case "!":
      return !toBoolean(val);
    default:
      throw new EvaluationError(`Unknown unary operator: ${op}`);
  }
}

/**
 * Evaluate a function call.
 */
function evaluateCall(
  fn: string,
  args: readonly ASTNode[],
  context: EvaluationContext
): unknown {
  switch (fn) {
    case "exists": {
      const val = evaluate(args[0]!, context);
      return val !== null && val !== undefined;
    }

    case "is_string": {
      const val = evaluate(args[0]!, context);
      return typeof val === "string";
    }

    case "is_number": {
      const val = evaluate(args[0]!, context);
      return typeof val === "number";
    }

    case "is_boolean": {
      const val = evaluate(args[0]!, context);
      return typeof val === "boolean";
    }

    case "equals": {
      const a = evaluate(args[0]!, context);
      const b = evaluate(args[1]!, context);
      return strictEquals(a, b);
    }

    case "registry.contains_state": {
      const id = evaluate(args[0]!, context);
      if (id === null) return false;
      if (typeof id !== "string") {
        throw new EvaluationError(
          `registry.contains_state requires string argument`
        );
      }
      return context.registry.contains_state(id);
    }

    case "registry.max_order_index": {
      return context.registry.max_order_index();
    }

    case "registry.compute_order_index": {
      const transition = evaluate(args[0]!, context);
      return context.registry.compute_order_index(transition);
    }

    default:
      throw new EvaluationError(`Unknown function: ${fn}`);
  }
}

/**
 * Convert a value to boolean.
 */
function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value !== "";
  return true;
}

/**
 * Strict equality comparison.
 */
function strictEquals(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }
  if (b === null || b === undefined) {
    return false;
  }

  // Same type comparison
  if (typeof a !== typeof b) return false;

  return a === b;
}

/**
 * Compare two numbers with a comparator function.
 */
function compareNumbers(
  a: unknown,
  b: unknown,
  comparator: (a: number, b: number) => boolean
): boolean {
  if (typeof a !== "number" || typeof b !== "number") {
    throw new EvaluationError(
      `Comparison operators require numeric operands`
    );
  }
  return comparator(a, b);
}
