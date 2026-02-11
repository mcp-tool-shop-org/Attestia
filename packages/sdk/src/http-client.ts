/**
 * @attestia/sdk — HTTP Client.
 *
 * Wraps native fetch() with:
 * - API key header injection
 * - Request ID generation
 * - Timeout handling
 * - Retry logic (exponential backoff for 5xx)
 * - Error normalization
 * - Typed responses
 *
 * Design:
 * - Zero external dependencies (uses native fetch)
 * - Configurable via AttestiaClientConfig
 * - Custom fetch function for testing
 */

import type { AttestiaClientConfig } from "./types.js";
import { AttestiaError } from "./types.js";

// =============================================================================
// Internal Helpers
// =============================================================================

/** Generate a simple request ID */
function generateRequestId(): string {
  return `sdk-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Sleep for the given number of milliseconds */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a response body as JSON, handling empty responses.
 */
async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Extract selected headers from a Response.
 */
function extractHeaders(response: Response): Record<string, string> {
  const result: Record<string, string> = {};
  const interestingHeaders = [
    "content-type",
    "x-request-id",
    "x-ratelimit-remaining",
    "retry-after",
  ];

  for (const name of interestingHeaders) {
    const value = response.headers.get(name);
    if (value !== null) {
      result[name] = value;
    }
  }

  return result;
}

// =============================================================================
// HTTP Client
// =============================================================================

/**
 * Low-level HTTP client for the Attestia API.
 *
 * Provides typed get/post methods with automatic retries,
 * timeout handling, and error normalization.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly fetchFn: typeof fetch;

  constructor(config: AttestiaClientConfig) {
    // Strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.retries ?? 3;
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
  }

  /**
   * Perform a GET request.
   */
  async get<T>(path: string): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    return this.request<T>("GET", path);
  }

  /**
   * Perform a POST request with a JSON body.
   */
  async post<T>(path: string, body: unknown): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    return this.request<T>("POST", path, body);
  }

  /**
   * Core request method with retry logic.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ data: T; status: number; headers: Record<string, string> }> {
    const url = `${this.baseUrl}${path}`;
    const requestId = generateRequestId();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Request-Id": requestId,
    };

    if (this.apiKey !== undefined) {
      headers["X-Api-Key"] = this.apiKey;
    }

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init);
        const responseBody = await parseResponseBody(response);
        const responseHeaders = extractHeaders(response);

        // 2xx → success
        if (response.ok) {
          return {
            data: (responseBody as { data?: T }).data ?? responseBody as T,
            status: response.status,
            headers: responseHeaders,
          };
        }

        // 4xx → don't retry (client errors)
        if (response.status >= 400 && response.status < 500) {
          const errorBody = responseBody as {
            error?: { code?: string; message?: string; details?: unknown };
          };
          throw new AttestiaError(
            errorBody.error?.code ?? "CLIENT_ERROR",
            errorBody.error?.message ?? `HTTP ${response.status}`,
            response.status,
            errorBody.error?.details,
          );
        }

        // 5xx → retry with backoff
        if (response.status >= 500 && attempt < this.maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(backoffMs);
          lastError = new AttestiaError(
            "SERVER_ERROR",
            `HTTP ${response.status}`,
            response.status,
          );
          continue;
        }

        // 5xx on last attempt
        const errorBody = responseBody as {
          error?: { code?: string; message?: string };
        };
        throw new AttestiaError(
          errorBody.error?.code ?? "SERVER_ERROR",
          errorBody.error?.message ?? `HTTP ${response.status} after ${attempt + 1} attempts`,
          response.status,
        );
      } catch (error) {
        if (error instanceof AttestiaError) {
          throw error;
        }

        // Network / timeout errors → retry
        if (attempt < this.maxRetries) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
          await sleep(backoffMs);
          continue;
        }

        throw new AttestiaError(
          "NETWORK_ERROR",
          lastError?.message ?? (error instanceof Error ? error.message : "Network error"),
          0,
        );
      }
    }

    // Should never reach here, but just in case
    throw new AttestiaError(
      "NETWORK_ERROR",
      lastError?.message ?? "Request failed after all retries",
      0,
    );
  }

  /**
   * Fetch with a timeout using AbortController.
   */
  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await this.fetchFn(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AttestiaError(
          "TIMEOUT",
          `Request timed out after ${this.timeout}ms`,
          0,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
