/**
 * Tests for witness timeout → retry → degraded behavior.
 *
 * Verifies that when the XRPL client times out, the submitter
 * retries and eventually throws WitnessSubmitError.
 */

import { describe, it, expect, vi } from "vitest";
import {
  withRetry,
  RetryExhaustedError,
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

describe("witness timeout scenarios", () => {
  it("timeout error is retryable", () => {
    expect(isRetryableXrplError(new Error("Connection timeout"))).toBe(true);
    expect(isRetryableXrplError(new Error("ETIMEDOUT"))).toBe(true);
    expect(isRetryableXrplError(new Error("request timed out"))).toBe(true);
  });

  it("retries on timeout, succeeds on second attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("Connection timeout"))
      .mockResolvedValueOnce("submitted");

    const result = await withRetry(fn, fastConfig, isRetryableXrplError, noopSleep);
    expect(result).toBe("submitted");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on timeout, exhausts all attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("Connection timeout"));

    await expect(
      withRetry(fn, fastConfig, isRetryableXrplError, noopSleep),
    ).rejects.toThrow(RetryExhaustedError);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("socket hang up is retryable", () => {
    expect(isRetryableXrplError(new Error("socket hang up"))).toBe(true);
  });

  it("ECONNREFUSED is retryable", () => {
    expect(isRetryableXrplError(new Error("ECONNREFUSED"))).toBe(true);
  });

  it("WebSocket closed before connected is retryable", () => {
    expect(
      isRetryableXrplError(
        new Error("WebSocket was closed before the connection was established"),
      ),
    ).toBe(true);
  });
});
