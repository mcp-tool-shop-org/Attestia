/**
 * Error envelope types for API responses.
 *
 * All error responses follow the shape:
 * { error: { code: string, message: string, details?: Record<string, unknown> } }
 */

// =============================================================================
// Error Codes
// =============================================================================

/**
 * Known API error codes.
 *
 * These are mapped from domain errors and HTTP semantics.
 */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUDGET_EXCEEDED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "IDEMPOTENCY_CONFLICT"
  | "PRECONDITION_FAILED"
  | "INTERNAL_ERROR";

// =============================================================================
// Error Response
// =============================================================================

export interface ErrorDetail {
  readonly code: ApiErrorCode | string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  readonly error: ErrorDetail;
}

// =============================================================================
// Factory
// =============================================================================

export function createErrorEnvelope(
  code: ApiErrorCode | string,
  message: string,
  details?: Record<string, unknown>,
): ErrorEnvelope {
  const error: ErrorDetail = { code, message };
  if (details !== undefined) {
    return { error: { ...error, details } };
  }
  return { error };
}
