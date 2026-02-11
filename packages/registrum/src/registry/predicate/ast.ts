/**
 * Registrum Predicate Expression AST
 *
 * Defines the Abstract Syntax Tree nodes for the RPEG v1 DSL.
 *
 * Design constraints:
 * - Always terminates
 * - Evaluates to boolean
 * - No side effects
 * - No semantic access
 * - No loops, recursion, or aggregation
 * - Statically auditable
 */

/**
 * Literal value node.
 * Represents: true, false, null, integers, strings
 */
export interface LiteralNode {
  readonly kind: "Literal";
  readonly value: boolean | number | string | null;
}

/**
 * Identifier node.
 * Represents: state.id, transition.from, registry.state_ids, etc.
 * Path is split by dots: ["state", "id"]
 */
export interface IdentifierNode {
  readonly kind: "Identifier";
  readonly path: readonly string[];
}

/**
 * Binary operation node.
 * Operators: ==, !=, >, <, >=, <=, &&, ||
 */
export interface BinaryNode {
  readonly kind: "Binary";
  readonly op: BinaryOperator;
  readonly left: ASTNode;
  readonly right: ASTNode;
}

/**
 * Unary operation node.
 * Operators: ! (logical not)
 */
export interface UnaryNode {
  readonly kind: "Unary";
  readonly op: UnaryOperator;
  readonly operand: ASTNode;
}

/**
 * Function call node.
 * Functions: exists, is_string, is_number, equals, registry.contains_state, etc.
 */
export interface CallNode {
  readonly kind: "Call";
  readonly fn: string;
  readonly args: readonly ASTNode[];
}

/**
 * Union of all AST node types.
 */
export type ASTNode =
  | LiteralNode
  | IdentifierNode
  | BinaryNode
  | UnaryNode
  | CallNode;

/**
 * Allowed binary operators.
 */
export type BinaryOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "&&"
  | "||";

/**
 * Allowed unary operators.
 */
export type UnaryOperator = "!";

/**
 * Type guards for AST nodes.
 */
export function isLiteralNode(node: ASTNode): node is LiteralNode {
  return node.kind === "Literal";
}

export function isIdentifierNode(node: ASTNode): node is IdentifierNode {
  return node.kind === "Identifier";
}

export function isBinaryNode(node: ASTNode): node is BinaryNode {
  return node.kind === "Binary";
}

export function isUnaryNode(node: ASTNode): node is UnaryNode {
  return node.kind === "Unary";
}

export function isCallNode(node: ASTNode): node is CallNode {
  return node.kind === "Call";
}

/**
 * Create AST nodes (factory functions).
 */
export function literal(value: boolean | number | string | null): LiteralNode {
  return { kind: "Literal", value };
}

export function identifier(path: readonly string[]): IdentifierNode {
  return { kind: "Identifier", path };
}

export function binary(
  op: BinaryOperator,
  left: ASTNode,
  right: ASTNode
): BinaryNode {
  return { kind: "Binary", op, left, right };
}

export function unary(op: UnaryOperator, operand: ASTNode): UnaryNode {
  return { kind: "Unary", op, operand };
}

export function call(fn: string, args: readonly ASTNode[]): CallNode {
  return { kind: "Call", fn, args };
}
