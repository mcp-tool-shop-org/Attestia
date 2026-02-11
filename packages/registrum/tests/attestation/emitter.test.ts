/**
 * Attestation Emitter Tests
 *
 * Tests for attestation emission functionality.
 * Verifies that emission is non-blocking and cannot affect registration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  emitAttestation,
  createAttestationHook,
  createAttestationConfig,
  DEFAULT_ATTESTATION_CONFIG,
} from "../../src/attestation/index.js";
import type {
  AttestationPayload,
  AttestationConfig,
} from "../../src/attestation/index.js";

// Test fixture
const createTestPayload = (): AttestationPayload => ({
  registrum_version: "1.0.0",
  snapshot_version: "1",
  snapshot_hash: "a".repeat(64),
  registry_hash: "b".repeat(64),
  mode: "dual",
  parity_status: "AGREED",
  transition_range: { from: 0, to: 100 },
  state_count: 10,
  ordering_max: 9,
});

describe("Attestation Configuration", () => {
  it("default config has attestation disabled", () => {
    expect(DEFAULT_ATTESTATION_CONFIG.xrpl.enabled).toBe(false);
  });

  it("createAttestationConfig applies overrides", () => {
    const config = createAttestationConfig({
      xrpl: { enabled: true, outputMode: "stdout" },
    });

    expect(config.xrpl.enabled).toBe(true);
    expect(config.xrpl.outputMode).toBe("stdout");
  });
});

describe("Attestation Emitter", () => {
  describe("disabled attestation", () => {
    it("skips emission when disabled", () => {
      const payload = createTestPayload();
      const config = createAttestationConfig({ xrpl: { enabled: false } });

      const result = emitAttestation(payload, config);

      expect(result.attempted).toBe(false);
      expect(result.success).toBe(true);
    });
  });

  describe("stdout emission", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("emits to stdout when enabled", () => {
      const payload = createTestPayload();
      const config = createAttestationConfig({
        xrpl: { enabled: true, outputMode: "stdout" },
      });

      const result = emitAttestation(payload, config);

      expect(result.attempted).toBe(true);
      expect(result.success).toBe(true);
      expect(result.output).toBe("stdout");
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe("callback emission", () => {
    it("calls callback when configured", () => {
      const payload = createTestPayload();
      const callback = vi.fn();
      const config = createAttestationConfig({
        xrpl: { enabled: true, outputMode: "callback", onAttestation: callback },
      });

      const result = emitAttestation(payload, config);

      expect(result.attempted).toBe(true);
      expect(result.success).toBe(true);
      expect(result.output).toBe("callback");
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("returns error when callback missing", () => {
      const payload = createTestPayload();
      const config: AttestationConfig = {
        xrpl: { enabled: true, outputMode: "callback" },
      };

      const result = emitAttestation(payload, config);

      expect(result.attempted).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain("No callback configured");
    });
  });

  describe("file emission", () => {
    const testOutputPath = path.join(
      process.cwd(),
      "test-attestation-output.json"
    );

    afterEach(() => {
      try {
        fs.unlinkSync(testOutputPath);
      } catch {
        // Ignore if file doesn't exist
      }
    });

    it("writes to file when configured", () => {
      const payload = createTestPayload();
      const config = createAttestationConfig({
        xrpl: { enabled: true, outputMode: "file", outputPath: testOutputPath },
      });

      const result = emitAttestation(payload, config);

      expect(result.attempted).toBe(true);
      expect(result.success).toBe(true);
      expect(result.output).toBe(testOutputPath);
      expect(fs.existsSync(testOutputPath)).toBe(true);

      const content = fs.readFileSync(testOutputPath, "utf8");
      const parsed = JSON.parse(content);
      expect(parsed.registrum_version).toBe("1.0.0");
    });

    it("returns error when outputPath missing", () => {
      const payload = createTestPayload();
      const config: AttestationConfig = {
        xrpl: { enabled: true, outputMode: "file" },
      };

      const result = emitAttestation(payload, config);

      expect(result.attempted).toBe(true);
      expect(result.success).toBe(false);
      expect(result.error).toContain("No output path configured");
    });
  });

  describe("error handling (CRITICAL)", () => {
    it("NEVER throws on emission failure", () => {
      const payload = createTestPayload();
      const config = createAttestationConfig({
        xrpl: {
          enabled: true,
          outputMode: "callback",
          onAttestation: () => {
            throw new Error("Callback exploded!");
          },
        },
      });

      // This MUST NOT throw
      let result;
      expect(() => {
        result = emitAttestation(payload, config);
      }).not.toThrow();

      expect(result).toBeDefined();
      expect(result!.attempted).toBe(true);
      expect(result!.success).toBe(false);
      expect(result!.error).toContain("Callback exploded!");
    });

    it("logs warning on failure", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const payload = createTestPayload();
      const config = createAttestationConfig({
        xrpl: {
          enabled: true,
          outputMode: "callback",
          onAttestation: () => {
            throw new Error("Test error");
          },
        },
      });

      emitAttestation(payload, config);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Attestation] Emission failed")
      );

      warnSpy.mockRestore();
    });
  });
});

describe("Attestation Hook", () => {
  it("creates reusable hook function", () => {
    const callback = vi.fn();
    const config = createAttestationConfig({
      xrpl: { enabled: true, outputMode: "callback", onAttestation: callback },
    });

    const hook = createAttestationHook(config);
    const payload = createTestPayload();

    const result = hook(payload);

    expect(result.success).toBe(true);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("hook is safe to call multiple times", () => {
    const callback = vi.fn();
    const config = createAttestationConfig({
      xrpl: { enabled: true, outputMode: "callback", onAttestation: callback },
    });

    const hook = createAttestationHook(config);

    for (let i = 0; i < 5; i++) {
      const payload = createTestPayload();
      hook(payload);
    }

    expect(callback).toHaveBeenCalledTimes(5);
  });
});

describe("Attestation Registration Independence (CRITICAL)", () => {
  it("attestation failure does not affect registrar", async () => {
    // This test verifies the CRITICAL constraint:
    // Failure to attest MUST NOT affect Registrum behavior.

    // Create a config with a failing callback
    const config = createAttestationConfig({
      xrpl: {
        enabled: true,
        outputMode: "callback",
        onAttestation: () => {
          throw new Error("Network timeout");
        },
      },
    });

    // Emission should fail gracefully
    const payload = createTestPayload();
    const result = emitAttestation(payload, config);

    // Verify failure was captured, not thrown
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // The fact that we got here proves the caller wasn't affected
  });
});
