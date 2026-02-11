/**
 * @attestia/sdk — SDK types.
 *
 * Types specific to the SDK client layer.
 * Domain types are imported from @attestia/types.
 */

// =============================================================================
// Client Configuration
// =============================================================================

/**
 * Configuration for the Attestia SDK client.
 */
export interface AttestiaClientConfig {
  /** Base URL of the Attestia API (e.g., "https://api.attestia.io") */
  readonly baseUrl: string;
  /** API key for authentication (optional for public endpoints) */
  readonly apiKey?: string | undefined;
  /** Request timeout in milliseconds (default: 30000) */
  readonly timeout?: number | undefined;
  /** Maximum retry attempts for 5xx errors (default: 3) */
  readonly retries?: number | undefined;
  /** Custom fetch function (for testing or polyfills) */
  readonly fetchFn?: typeof fetch | undefined;
}

// =============================================================================
// Response Types
// =============================================================================

/**
 * Standard Attestia API response envelope.
 */
export interface AttestiaResponse<T> {
  /** Response payload */
  readonly data: T;
  /** HTTP status code */
  readonly status: number;
  /** Response headers (selected) */
  readonly headers: Readonly<Record<string, string>>;
}

/**
 * Paginated list response.
 */
export interface PaginatedList<T> {
  /** Items in this page */
  readonly data: readonly T[];
  /** Pagination metadata */
  readonly pagination: {
    readonly total: number;
    readonly hasMore: boolean;
    readonly cursor?: string | undefined;
    readonly limit: number;
  };
}

// =============================================================================
// Error Types
// =============================================================================

/**
 * Structured error from the Attestia API.
 */
export class AttestiaError extends Error {
  /** Error code from the API (e.g., "NOT_FOUND", "VALIDATION_ERROR") */
  readonly code: string;
  /** HTTP status code */
  readonly statusCode: number;
  /** Additional error details (validation errors, etc.) */
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = "AttestiaError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}
