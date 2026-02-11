/**
 * Attestation Types
 *
 * Type definitions for external attestation payloads.
 * These types define the structure of cryptographic witnesses
 * emitted to external ledgers (e.g., XRPL).
 *
 * @module attestation/types
 */

/**
 * Operating mode at attestation time.
 */
export type AttestationMode = "dual" | "legacy-only" | "registry-only";

/**
 * Parity status between witnesses.
 */
export type ParityStatus = "AGREED" | "HALTED";

/**
 * Transition index range covered by attestation.
 */
export interface TransitionRange {
  readonly from: number;
  readonly to: number;
}

/**
 * Attestation payload structure.
 *
 * This is the canonical format for external attestations.
 * All fields are mandatory; no additional fields are permitted.
 *
 * @remarks
 * Attestations are witnesses, not judges. They record that Registrum
 * made a decision, but do not influence validity or acceptance.
 */
export interface AttestationPayload {
  /** Semantic version of Registrum that produced this attestation */
  readonly registrum_version: string;

  /** Snapshot schema version */
  readonly snapshot_version: string;

  /** Content-addressed hash of snapshot (hex-encoded SHA-256) */
  readonly snapshot_hash: string;

  /** Content-addressed hash of registry (hex-encoded SHA-256) */
  readonly registry_hash: string;

  /** Operating mode at attestation time */
  readonly mode: AttestationMode;

  /** Parity status between legacy and registry witnesses */
  readonly parity_status: ParityStatus;

  /** Transition index range covered */
  readonly transition_range: TransitionRange;

  /** Number of registered states */
  readonly state_count: number;

  /** Maximum order index assigned */
  readonly ordering_max: number;
}

/**
 * Options for generating an attestation payload.
 */
export interface AttestationOptions {
  /** Registrum version string */
  readonly registrumVersion: string;

  /** Operating mode */
  readonly mode: AttestationMode;

  /** Parity status */
  readonly parityStatus: ParityStatus;

  /** First transition index (inclusive) */
  readonly transitionFrom: number;

  /** Last transition index (inclusive) */
  readonly transitionTo: number;
}

/**
 * XRPL memo entry for attestation encoding.
 */
export interface XrplMemo {
  readonly MemoType: string;
  readonly MemoData: string;
}

/**
 * XRPL memo encoding of attestation payload.
 */
export interface XrplAttestationMemos {
  readonly Memos: readonly { readonly Memo: XrplMemo }[];
}
