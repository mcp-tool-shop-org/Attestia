/**
 * Attestation Emitter
 *
 * Handles emission of attestation payloads to configured outputs.
 * Emission is non-blocking and cannot affect registration.
 *
 * Key constraint: Failure to attest MUST NOT affect Registrum behavior.
 *
 * @module attestation/emitter
 */

import { writeFileSync } from "fs";
import type { AttestationPayload } from "./types.js";
import type { AttestationConfig } from "./config.js";
import { serializeAttestationPayload } from "./generator.js";

/**
 * Emission result.
 */
export interface EmissionResult {
  /** Whether emission was attempted */
  readonly attempted: boolean;

  /** Whether emission succeeded */
  readonly success: boolean;

  /** Error message if emission failed */
  readonly error?: string;

  /** Output location (file path, "stdout", or "callback") */
  readonly output?: string;
}

/**
 * Emit an attestation payload according to configuration.
 *
 * CRITICAL: This function NEVER throws. Emission failure is logged
 * but does not affect the caller. This ensures attestation cannot
 * block or influence Registrum behavior.
 *
 * @param payload - Attestation payload to emit
 * @param config - Attestation configuration
 * @returns Emission result (never throws)
 */
export function emitAttestation(
  payload: AttestationPayload,
  config: AttestationConfig
): EmissionResult {
  // Not enabled — skip silently
  if (!config.xrpl.enabled) {
    return {
      attempted: false,
      success: true,
    };
  }

  const serialized = serializeAttestationPayload(payload);
  const outputMode = config.xrpl.outputMode ?? "stdout";

  try {
    switch (outputMode) {
      case "file":
        if (config.xrpl.outputPath) {
          writeFileSync(config.xrpl.outputPath, serialized, "utf8");
          return {
            attempted: true,
            success: true,
            output: config.xrpl.outputPath,
          };
        }
        return {
          attempted: true,
          success: false,
          error: "No output path configured",
        };

      case "stdout":
        console.log(serialized);
        return {
          attempted: true,
          success: true,
          output: "stdout",
        };

      case "callback":
        if (config.xrpl.onAttestation) {
          config.xrpl.onAttestation(serialized);
          return {
            attempted: true,
            success: true,
            output: "callback",
          };
        }
        return {
          attempted: true,
          success: false,
          error: "No callback configured",
        };

      default:
        return {
          attempted: true,
          success: false,
          error: `Unknown output mode: ${outputMode}`,
        };
    }
  } catch (err) {
    // CRITICAL: Never throw. Log and return failure.
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[Attestation] Emission failed: ${errorMessage}`);

    return {
      attempted: true,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create an attestation hook for use with registrar.
 *
 * Returns a function that can be called after snapshots to emit attestations.
 * The hook is safe to call — failures are logged but never thrown.
 *
 * @param config - Attestation configuration
 * @returns Hook function
 */
export function createAttestationHook(
  config: AttestationConfig
): (payload: AttestationPayload) => EmissionResult {
  return (payload: AttestationPayload) => emitAttestation(payload, config);
}
