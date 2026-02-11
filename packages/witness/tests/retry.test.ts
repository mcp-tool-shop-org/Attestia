/**
 * Tests for retry with exponential backoff.
 */

import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  RetryExhaustedError,
  computeDelay,
  isRetryableXrplError,
} from "../src/retry.js";
import type { RetryConfig } from "../src/retry.js";

const fastConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 10,
  maxDelayMs: 100,
  jitterMs: 0,
};

const noopSleep = async (_ms: number) => {};

describe("withRetry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, fastConfig, () => true, noopSleep);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce("recovered");

    const result = await withRetry(fn, fastConfig, () => true, noopSleep);
    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries twice then succeeds on third attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail-1"))
      .mockRejectedValueOnce(new Error("fail-2"))
      .mockResolvedValueOnce("ok");

    const result = await withRetry(fn, fastConfig, () => true, noopSleep);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws RetryExhaustedError when all attempts fail", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fail"));

    await expect(withRetry(fn, fastConfig, () => true, noopSleep))
      .rejects.toThrow(RetryExhaustedError);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("RetryExhaustedError contains correct attempts count and last error", async () => {
    const lastErr = new Error("last");
    const fn = vi.fn().mockRejectedValue(lastErr);

    try {
      await withRetry(fn, fastConfig, () => true, noopSleep);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RetryExhaustedError);
      const rErr = err as RetryExhaustedError;
      expect(rErr.attempts).toBe(3);
      expect(rErr.lastError).toBe(lastErr);
    }
  });

  it("does not retry when shouldRetry returns false", async () => {
    const permanent = new Error("permanent");
    const fn = vi.fn().mockRejectedValue(permanent);

    await expect(withRetry(fn, fastConfig, () => false, noopSleep))
      .rejects.toThrow("permanent");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls sleepFn between retries with increasing delays", async () => {
    const delays: number[] = [];
    const mockSleep = async (ms: number) => { delays.push(ms); };
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const config: RetryConfig = {
      maxAttempts: 4,
      baseDelayMs: 100,
      maxDelayMs: 10000,
      jitterMs: 0, // no randomness for predictable test
    };

    try {
      await withRetry(fn, config, () => true, mockSleep);
    } catch {
      // expected
    }

    // 4 attempts = 3 sleeps (between attempts)
    expect(delays).toHaveLength(3);
    // Exponential: 100*2^0=100, 100*2^1=200, 100*2^2=400
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(400);
  });

  it("respects maxDelayMs cap", async () => {
    const delays: number[] = [];
    const mockSleep = async (ms: number) => { delays.push(ms); };
    const fn = vi.fn().mockRejectedValue(new Error("fail"));

    const config: RetryConfig = {
      maxAttempts: 5,
      baseDelayMs: 100,
      maxDelayMs: 300,
      jitterMs: 0,
    };

    try {
      await withRetry(fn, config, () => true, mockSleep);
    } catch {
      // expected
    }

    // 100, 200, 300 (capped), 300 (capped)
    expect(delays).toEqual([100, 200, 300, 300]);
  });
});

describe("computeDelay", () => {
  it("computes exponential backoff", () => {
    const config: RetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 10000,
      jitterMs: 0,
    };
    expect(computeDelay(0, config)).toBe(100);
    expect(computeDelay(1, config)).toBe(200);
    expect(computeDelay(2, config)).toBe(400);
  });
});

describe("isRetryableXrplError", () => {
  it("returns true for network errors", () => {
    expect(isRetryableXrplError(new Error("Connection timeout"))).toBe(true);
  });

  it("returns true for non-Error values", () => {
    expect(isRetryableXrplError("some string error")).toBe(true);
  });

  it("returns false for permanent XRPL errors", () => {
    expect(isRetryableXrplError(new Error("temBAD_AMOUNT"))).toBe(false);
    expect(isRetryableXrplError(new Error("temMALFORMED: invalid field"))).toBe(false);
    expect(isRetryableXrplError(new Error("tefINVALID sequence"))).toBe(false);
  });

  it("returns false for not connected error", () => {
    expect(isRetryableXrplError(new Error("Not connected to XRPL"))).toBe(false);
  });
});
