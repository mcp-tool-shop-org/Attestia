/**
 * @attestia/witness — Retry with exponential backoff.
 *
 * Generic retry utility for transient failures. Used by XrplSubmitter
 * to retry XRPL transaction submissions.
 *
 * Backoff formula: min(baseDelayMs * 2^attempt + jitter, maxDelayMs)
 * where jitter = random(0, jitterMs)
 */

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of attempts (including the first try). Default: 3 */
  readonly maxAttempts: number;
  /** Base delay in ms before first retry. Default: 1000 */
  readonly baseDelayMs: number;
  /** Maximum delay in ms between retries. Default: 30000 */
  readonly maxDelayMs: number;
  /** Maximum random jitter in ms added to each delay. Default: 200 */
  readonly jitterMs: number;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterMs: 200,
};

/**
 * Error thrown when all retry attempts are exhausted.
 */
export class RetryExhaustedError extends Error {
  constructor(
    /** Number of attempts made */
    public readonly attempts: number,
    /** The last error encountered */
    public readonly lastError: unknown,
  ) {
    const msg = lastError instanceof Error ? lastError.message : String(lastError);
    super(`All ${attempts} retry attempts exhausted. Last error: ${msg}`);
    this.name = "RetryExhaustedError";
  }
}

/**
 * Sleep for the specified duration.
 * Extracted for testability — can be mocked in tests.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute the delay before the next retry attempt.
 *
 * @param attempt - Zero-based attempt index (0 = first retry)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function computeDelay(attempt: number, config: RetryConfig): number {
  const exponential = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * config.jitterMs;
  return Math.min(exponential + jitter, config.maxDelayMs);
}

/**
 * Execute a function with retry on failure.
 *
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @param shouldRetry - Predicate to determine if an error is retryable (default: all errors)
 * @param sleepFn - Sleep function (injectable for testing)
 * @returns The result of the function
 * @throws RetryExhaustedError if all attempts fail
 * @throws The original error if shouldRetry returns false
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  shouldRetry: (err: unknown) => boolean = () => true,
  sleepFn: (ms: number) => Promise<void> = sleep,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      // Check if this error is retryable
      if (!shouldRetry(err)) {
        throw err;
      }

      // If this was the last attempt, don't sleep — just fall through to throw
      if (attempt < config.maxAttempts - 1) {
        const delay = computeDelay(attempt, config);
        await sleepFn(delay);
      }
    }
  }

  throw new RetryExhaustedError(config.maxAttempts, lastError);
}

/**
 * Default XRPL retry predicate.
 *
 * Returns true for transient/network errors that may succeed on retry.
 * Returns false for permanent errors that will never succeed.
 */
export function isRetryableXrplError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;

  const msg = err.message.toLowerCase();

  // Permanent XRPL errors — do not retry
  const permanentPatterns = [
    "tembad",         // temBAD_AMOUNT, temBAD_FEE, etc.
    "tefinvalid",     // tefINVALID, etc.
    "tefdst_tag",     // tefDST_TAG_NEEDED
    "temmalformed",
    "temredundant",
    "not connected",  // Not connected — caller should reconnect, not retry blindly
  ];

  for (const pattern of permanentPatterns) {
    if (msg.includes(pattern)) return false;
  }

  // Everything else is potentially retryable (network errors, timeouts, tec codes)
  return true;
}
