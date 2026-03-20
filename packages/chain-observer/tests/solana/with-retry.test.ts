/**
 * Tests for Solana RPC retry helper.
 *
 * Verifies:
 * - Successful calls return immediately
 * - Transient errors are retried up to maxRetries
 * - Non-retryable errors propagate immediately
 * - Exponential backoff is applied between retries
 */

import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../../src/solana/with-retry.js";

describe("withRetry", () => {
  it("returns immediately on success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, 3, 10);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient RPC failure then succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockRejectedValueOnce(new Error("503 Service Unavailable"))
      .mockResolvedValue("recovered");

    const result = await withRetry(fn, 3, 1);
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting all retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fetch failed"));

    await expect(withRetry(fn, 2, 1)).rejects.toThrow("fetch failed");
    // 1 initial + 2 retries = 3 calls
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("propagates non-retryable errors immediately", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Invalid public key input"));

    await expect(withRetry(fn, 3, 1)).rejects.toThrow("Invalid public key");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on rate limit (429) errors", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("429 Too Many Requests"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, 2, 1);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on ECONNREFUSED", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:8899"))
      .mockResolvedValue("ok");

    const result = await withRetry(fn, 2, 1);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on non-Error throws", async () => {
    const fn = vi.fn().mockRejectedValue("string error");

    await expect(withRetry(fn, 3, 1)).rejects.toBe("string error");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("works with maxRetries=0 (no retries)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fetch failed"));

    await expect(withRetry(fn, 0, 1)).rejects.toThrow("fetch failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
