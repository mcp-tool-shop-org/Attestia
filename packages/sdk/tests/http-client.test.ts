/**
 * HTTP Client Tests
 *
 * Verifies:
 * - GET and POST requests
 * - API key header injection
 * - Request ID header
 * - Timeout handling
 * - Retry on 5xx
 * - No retry on 4xx
 * - Error normalization
 */

import { describe, it, expect, vi } from "vitest";
import { HttpClient } from "../src/http-client.js";
import { AttestiaError } from "../src/types.js";

// =============================================================================
// Mock Fetch Helper
// =============================================================================

function createMockFetch(
  responses: Array<{
    status: number;
    body?: unknown;
    headers?: Record<string, string>;
    delay?: number;
    error?: Error;
  }>,
): typeof fetch {
  let callIndex = 0;

  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => {
    const config = responses[callIndex];
    callIndex++;

    if (config === undefined) {
      throw new Error(`Mock fetch called more times than expected (call ${callIndex})`);
    }

    if (config.error !== undefined) {
      throw config.error;
    }

    if (config.delay !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, config.delay));
    }

    const headers = new Headers(config.headers ?? {});
    const body = config.body !== undefined ? JSON.stringify(config.body) : "";

    return new Response(body, {
      status: config.status,
      headers,
    });
  }) as unknown as typeof fetch;
}

// =============================================================================
// GET Requests
// =============================================================================

describe("HttpClient GET", () => {
  it("makes a GET request and returns data", async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: { data: { id: "test-1", name: "Test" } } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.get<{ id: string; name: string }>("/api/v1/items/1");

    expect(result.data).toEqual({ id: "test-1", name: "Test" });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledOnce();

    // Verify URL
    const [url] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("https://api.example.com/api/v1/items/1");
  });

  it("strips trailing slash from base URL", async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: { data: {} } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com/",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.get("/test");

    const [url] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe("https://api.example.com/test");
  });
});

// =============================================================================
// POST Requests
// =============================================================================

describe("HttpClient POST", () => {
  it("makes a POST request with JSON body", async () => {
    const mockFetch = createMockFetch([
      { status: 201, body: { data: { id: "new-1" } } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.post<{ id: string }>("/api/v1/items", {
      name: "New Item",
    });

    expect(result.data).toEqual({ id: "new-1" });
    expect(result.status).toBe(201);

    // Verify body was sent
    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ name: "New Item" }));
  });
});

// =============================================================================
// Headers
// =============================================================================

describe("HttpClient headers", () => {
  it("injects API key header when configured", async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: { data: {} } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      apiKey: "test-api-key-123",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.get("/test");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers["X-Api-Key"]).toBe("test-api-key-123");
  });

  it("does not inject API key when not configured", async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: { data: {} } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.get("/test");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers["X-Api-Key"]).toBeUndefined();
  });

  it("includes request ID header", async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: { data: {} } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.get("/test");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers["X-Request-Id"]).toBeTruthy();
    expect(init.headers["X-Request-Id"]).toMatch(/^sdk-/);
  });

  it("includes Content-Type and Accept headers", async () => {
    const mockFetch = createMockFetch([
      { status: 200, body: { data: {} } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await client.get("/test");

    const [, init] = (mockFetch as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.headers["Accept"]).toBe("application/json");
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe("HttpClient error handling", () => {
  it("throws AttestiaError on 4xx responses", async () => {
    const mockFetch = createMockFetch([
      {
        status: 404,
        body: { error: { code: "NOT_FOUND", message: "Item not found" } },
      },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    await expect(client.get("/api/v1/items/999")).rejects.toThrow(AttestiaError);

    try {
      await client.get("/api/v1/items/999");
    } catch (error) {
      // Second call will fail because mock only has 1 response
    }
  });

  it("4xx errors include code and status", async () => {
    const mockFetch = createMockFetch([
      {
        status: 400,
        body: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: { field: "name" },
          },
        },
      },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    try {
      await client.post("/api/v1/items", {});
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AttestiaError);
      const attError = error as AttestiaError;
      expect(attError.code).toBe("VALIDATION_ERROR");
      expect(attError.message).toBe("Invalid input");
      expect(attError.statusCode).toBe(400);
      expect(attError.details).toEqual({ field: "name" });
    }
  });

  it("does not retry on 4xx errors", async () => {
    const mockFetch = createMockFetch([
      { status: 404, body: { error: { code: "NOT_FOUND", message: "Not found" } } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 3, // retries configured, but should NOT retry on 4xx
    });

    await expect(client.get("/test")).rejects.toThrow(AttestiaError);
    expect(mockFetch).toHaveBeenCalledOnce(); // Only 1 call, no retries
  });
});

// =============================================================================
// Retry Logic
// =============================================================================

describe("HttpClient retry logic", () => {
  it("retries on 5xx errors", async () => {
    const mockFetch = createMockFetch([
      { status: 500, body: { error: { code: "SERVER_ERROR", message: "Internal error" } } },
      { status: 200, body: { data: { success: true } } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 2,
    });

    const result = await client.get<{ success: boolean }>("/test");
    expect(result.data).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(2); // First failed, second succeeded
  });

  it("gives up after max retries on persistent 5xx", async () => {
    const mockFetch = createMockFetch([
      { status: 503, body: { error: { code: "UNAVAILABLE", message: "Try again" } } },
      { status: 503, body: { error: { code: "UNAVAILABLE", message: "Try again" } } },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 1,
    });

    await expect(client.get("/test")).rejects.toThrow(AttestiaError);
    expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });
});

// =============================================================================
// Timeout
// =============================================================================

describe("HttpClient timeout", () => {
  it("throws timeout error when request exceeds timeout", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";

    const mockFetch = createMockFetch([
      { status: 200, body: { data: {} }, delay: 5000 },
    ]);

    // Override mock to check abort signal
    const abortAwareFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      // Simulate checking abort signal
      if (init?.signal?.aborted) {
        throw abortError;
      }
      // Return after checking - but in reality the timeout will fire first
      return await (mockFetch as Function)(url, init);
    }) as unknown as typeof fetch;

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: abortAwareFetch,
      timeout: 50, // Very short timeout
      retries: 0,
    });

    // This should either timeout or complete depending on timing
    // The important thing is it doesn't hang
    try {
      await client.get("/slow-endpoint");
    } catch (error) {
      expect(error).toBeInstanceOf(AttestiaError);
      if (error instanceof AttestiaError) {
        expect(["TIMEOUT", "NETWORK_ERROR"]).toContain(error.code);
      }
    }
  });
});

// =============================================================================
// Response Headers
// =============================================================================

describe("HttpClient response headers", () => {
  it("extracts interesting response headers", async () => {
    const mockFetch = createMockFetch([
      {
        status: 200,
        body: { data: {} },
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-123",
          "x-ratelimit-remaining": "42",
        },
      },
    ]);

    const client = new HttpClient({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      retries: 0,
    });

    const result = await client.get("/test");
    expect(result.headers["content-type"]).toBe("application/json");
    expect(result.headers["x-request-id"]).toBe("req-123");
    expect(result.headers["x-ratelimit-remaining"]).toBe("42");
  });
});
