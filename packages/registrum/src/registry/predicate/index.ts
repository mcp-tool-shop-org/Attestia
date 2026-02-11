/**
 * Registrum Predicate DSL
 *
 * Exports for the predicate expression language.
 */

// AST types and constructors
export type {
  ASTNode,
  LiteralNode,
  IdentifierNode,
  BinaryNode,
  UnaryNode,
  CallNode,
  BinaryOperator,
  UnaryOperator,
} from "./ast.js";

export {
  isLiteralNode,
  isIdentifierNode,
  isBinaryNode,
  isUnaryNode,
  isCallNode,
  literal,
  identifier,
  binary,
  unary,
  call,
} from "./ast.js";

// Parser
export { parsePredicate, ParseError } from "./parser.js";

// Validator
export {
  validatePredicate,
  validatePredicateSafe,
  ValidationError,
} from "./validator.js";
export type { ValidationResult } from "./validator.js";

// Evaluator
export { evaluatePredicate, EvaluationError } from "./evaluator.js";
export type { EvaluationContext } from "./evaluator.js";
