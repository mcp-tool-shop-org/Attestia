/**
 * @attestia/verify — Compliance framework types.
 *
 * Types for mapping Attestia controls to regulatory frameworks
 * (SOC 2 Type II, ISO 27001, etc.) and generating evidence reports.
 */

// =============================================================================
// Framework Types
// =============================================================================

/**
 * A compliance framework definition (e.g., SOC 2 Type II, ISO 27001).
 */
export interface ComplianceFramework {
  /** Unique identifier (e.g., "soc2-type2", "iso27001") */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Framework version or year */
  readonly version: string;
  /** Brief description */
  readonly description: string;
}

/**
 * Evidence types that Attestia can produce for compliance controls.
 */
export type EvidenceType =
  | "hash-chain"           // Tamper-evident event chain
  | "audit-log"            // Append-only audit trail
  | "replay-verification"  // Deterministic state replay
  | "merkle-proof"         // Cryptographic inclusion proofs
  | "multi-sig-governance" // N-of-M governance approvals
  | "reconciliation"       // Three-way reconciliation
  | "state-snapshot"       // Point-in-time state export
  | "consensus"            // Multi-verifier consensus
  ;

/**
 * Status of a control mapping.
 */
export type ControlStatus =
  | "implemented"   // Fully implemented in Attestia
  | "partial"       // Partially implemented
  | "planned"       // Planned for future implementation
  | "not-applicable" // Control doesn't apply to Attestia's domain
  ;

/**
 * A mapping from a framework control to an Attestia capability.
 */
export interface ControlMapping {
  /** Framework control ID (e.g., "CC1.1" for SOC 2) */
  readonly controlId: string;
  /** Framework control name/title */
  readonly controlName: string;
  /** Framework control description */
  readonly controlDescription: string;
  /** Attestia capability that satisfies this control */
  readonly attestiaControl: string;
  /** Which Attestia package/module provides this capability */
  readonly attestiaPackage: string;
  /** Evidence types that demonstrate compliance */
  readonly evidenceTypes: readonly EvidenceType[];
  /** Current implementation status */
  readonly status: ControlStatus;
  /** Additional notes on the mapping */
  readonly notes?: string | undefined;
}

// =============================================================================
// Report Types
// =============================================================================

/**
 * An evaluated control — includes runtime evidence check results.
 */
export interface EvaluatedControl {
  /** The static control mapping */
  readonly mapping: ControlMapping;
  /** Whether the control check passed at evaluation time */
  readonly passed: boolean;
  /** Reference or evidence detail */
  readonly evidenceDetail: string;
}

/**
 * A compliance report for a specific framework.
 */
export interface ComplianceReport {
  /** Framework this report covers */
  readonly framework: ComplianceFramework;
  /** All evaluated control mappings */
  readonly evaluations: readonly EvaluatedControl[];
  /** Total controls evaluated */
  readonly totalControls: number;
  /** Controls that passed */
  readonly passedControls: number;
  /** Score as a percentage (0-100) */
  readonly score: number;
  /** When this report was generated */
  readonly generatedAt: string;
}
