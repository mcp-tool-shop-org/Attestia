/**
 * Retry helper for Solana RPC calls with exponential backoff.
 *
 * Retries transient RPC errors (network timeouts, 429s, 5xx responses).
 * Non-retryable errors (invalid params, account not found) propagate immediately.
 */

/**
 * Execute an async function with exponential backoff retry.
 *
 * @param fn - The async function to execute
 * @param maxRetries - Maximum number of retry attempts (0 = no retries)
 * @param delayMs - Base delay between retries in milliseconds
 * @returns The result of the function
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      // Don't retry non-retryable errors
      if (!isRetryableError(err)) {
        throw err;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries) {
        const backoff = delayMs * Math.pow(2, attempt);
        await sleep(backoff);
      }
    }
  }

  throw lastError;
}

/**
 * Determine if an error is transient and worth retrying.
 */
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const msg = err.message.toLowerCase();

  // Network errors (fetch API failures, not application-level "fetch" in message)
  if (msg.includes("econnrefused") || msg.includes("etimedout") || msg.includes("enotfound")) {
    return true;
  }
  // fetch() network failure — matches "TypeError: fetch failed" but not "Transaction fetch failed"
  if (msg === "fetch failed" || msg.startsWith("fetch failed")) {
    return true;
  }

  // HTTP 429 (rate limit) or 5xx (server error)
  if (msg.includes("429") || msg.includes("too many requests")) return true;
  if (msg.includes("503") || msg.includes("502") || msg.includes("500")) return true;
  if (msg.includes("server error") || msg.includes("internal error")) return true;

  // Solana-specific transient errors
  if (msg.includes("node is behind") || msg.includes("blockhash not found")) return true;

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
