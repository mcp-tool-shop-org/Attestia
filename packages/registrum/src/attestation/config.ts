/**
 * Attestation Configuration
 *
 * Configuration for optional external attestation.
 * All attestation is disabled by default.
 *
 * @module attestation/config
 */

/**
 * XRPL attestation configuration.
 */
export interface XrplAttestationConfig {
  /** Enable XRPL attestation (default: false) */
  readonly enabled: boolean;

  /**
   * Output mode for attestation payloads.
   * - "file": Write to specified path
   * - "stdout": Write to stdout
   * - "callback": Call provided function
   */
  readonly outputMode?: "file" | "stdout" | "callback";

  /** Output file path (when outputMode is "file") */
  readonly outputPath?: string;

  /** Callback function (when outputMode is "callback") */
  readonly onAttestation?: (payload: string) => void;
}

/**
 * Full attestation configuration.
 */
export interface AttestationConfig {
  /** XRPL attestation settings */
  readonly xrpl: XrplAttestationConfig;
}

/**
 * Default attestation configuration.
 * All attestation is disabled by default.
 */
export const DEFAULT_ATTESTATION_CONFIG: AttestationConfig = {
  xrpl: {
    enabled: false,
  },
};

/**
 * Create attestation configuration with overrides.
 */
export function createAttestationConfig(
  overrides: Partial<AttestationConfig> = {}
): AttestationConfig {
  return {
    xrpl: {
      ...DEFAULT_ATTESTATION_CONFIG.xrpl,
      ...overrides.xrpl,
    },
  };
}

/**
 * Validate attestation configuration.
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateAttestationConfig(config: AttestationConfig): void {
  if (config.xrpl.enabled) {
    if (config.xrpl.outputMode === "file" && !config.xrpl.outputPath) {
      throw new Error(
        "Attestation config: outputPath required when outputMode is 'file'"
      );
    }
    if (config.xrpl.outputMode === "callback" && !config.xrpl.onAttestation) {
      throw new Error(
        "Attestation config: onAttestation callback required when outputMode is 'callback'"
      );
    }
  }
}
