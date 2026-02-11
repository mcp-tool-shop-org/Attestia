/**
 * @attestia/verify — SOC 2 Type II Control Mappings.
 *
 * Maps SOC 2 Trust Service Criteria (TSC) to Attestia capabilities.
 * SOC 2 Type II covers: Security (CC), Availability (A), Processing
 * Integrity (PI), Confidentiality (C), and Privacy (P).
 *
 * Focus: Security (CC) and Processing Integrity (PI) criteria — the
 * domains where Attestia provides direct, verifiable evidence.
 */

import type { ComplianceFramework, ControlMapping } from "./types.js";

// =============================================================================
// Framework Definition
// =============================================================================

export const SOC2_FRAMEWORK: ComplianceFramework = {
  id: "soc2-type2",
  name: "SOC 2 Type II",
  version: "2017",
  description:
    "AICPA Trust Service Criteria for Security, Availability, Processing Integrity, Confidentiality, and Privacy",
};

// =============================================================================
// Control Mappings
// =============================================================================

/**
 * SOC 2 Type II control mappings to Attestia capabilities.
 *
 * Covers:
 * - CC1: Control Environment
 * - CC2: Communication and Information
 * - CC3: Risk Assessment
 * - CC4: Monitoring Activities
 * - CC5: Control Activities
 * - CC6: Logical and Physical Access Controls
 * - CC7: System Operations
 * - CC8: Change Management
 * - CC9: Risk Mitigation
 * - PI1: Processing Integrity
 */
export const SOC2_MAPPINGS: readonly ControlMapping[] = [
  // CC1 — Control Environment
  {
    controlId: "CC1.1",
    controlName: "Commitment to Integrity and Ethical Values",
    controlDescription:
      "The entity demonstrates a commitment to integrity and ethical values",
    attestiaControl: "Immutable audit trail with tamper-evident hash chains",
    attestiaPackage: "@attestia/event-store",
    evidenceTypes: ["hash-chain", "audit-log"],
    status: "implemented",
    notes: "Every state change is recorded in an append-only, hash-chained event store",
  },
  {
    controlId: "CC1.2",
    controlName: "Board Oversight",
    controlDescription:
      "The board of directors demonstrates independence and exercises oversight",
    attestiaControl: "Multi-signature governance with N-of-M quorum",
    attestiaPackage: "@attestia/witness",
    evidenceTypes: ["multi-sig-governance", "audit-log"],
    status: "implemented",
    notes: "Governance changes require quorum approval from independent signers",
  },

  // CC2 — Communication and Information
  {
    controlId: "CC2.1",
    controlName: "Information Quality",
    controlDescription:
      "The entity obtains or generates and uses relevant, quality information",
    attestiaControl: "Three-way reconciliation across intents, ledger, and chain",
    attestiaPackage: "@attestia/reconciler",
    evidenceTypes: ["reconciliation", "state-snapshot"],
    status: "implemented",
  },
  {
    controlId: "CC2.2",
    controlName: "Internal Communication",
    controlDescription:
      "The entity internally communicates information necessary for controls",
    attestiaControl: "Domain event catalog with structured event types",
    attestiaPackage: "@attestia/event-store",
    evidenceTypes: ["audit-log", "hash-chain"],
    status: "implemented",
    notes: "31 typed event schemas ensure structured, auditable communication",
  },

  // CC3 — Risk Assessment
  {
    controlId: "CC3.1",
    controlName: "Risk Identification",
    controlDescription:
      "The entity specifies objectives and identifies risks to those objectives",
    attestiaControl: "Cross-chain invariant checks and discrepancy detection",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["reconciliation", "replay-verification"],
    status: "implemented",
    notes: "Automated detection of balance mismatches, missing transactions, and chain discrepancies",
  },
  {
    controlId: "CC3.4",
    controlName: "Fraud Risk Assessment",
    controlDescription:
      "The entity considers the potential for fraud in assessing risks",
    attestiaControl: "External verification network with multi-verifier consensus",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["consensus", "replay-verification"],
    status: "implemented",
    notes: "Independent third-party verifiers detect operator manipulation",
  },

  // CC4 — Monitoring Activities
  {
    controlId: "CC4.1",
    controlName: "Ongoing Monitoring",
    controlDescription:
      "The entity selects, develops, and performs ongoing monitoring activities",
    attestiaControl: "Deterministic replay verification of state transitions",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["replay-verification", "hash-chain"],
    status: "implemented",
  },
  {
    controlId: "CC4.2",
    controlName: "Deficiency Communication",
    controlDescription:
      "The entity evaluates and communicates internal control deficiencies",
    attestiaControl: "Reconciliation discrepancy reports with detailed findings",
    attestiaPackage: "@attestia/reconciler",
    evidenceTypes: ["reconciliation", "audit-log"],
    status: "implemented",
    notes: "Discrepancies are typed, counted, and surfaced in reports",
  },

  // CC5 — Control Activities
  {
    controlId: "CC5.1",
    controlName: "Control Selection",
    controlDescription:
      "The entity selects and develops control activities",
    attestiaControl: "Double-entry ledger with balance invariants",
    attestiaPackage: "@attestia/ledger",
    evidenceTypes: ["hash-chain", "replay-verification"],
    status: "implemented",
    notes: "Debits always equal credits; property-based tests verify invariants",
  },
  {
    controlId: "CC5.2",
    controlName: "Technology Controls",
    controlDescription:
      "The entity selects and develops technology-based control activities",
    attestiaControl: "SHA-256 hash chains with RFC 8785 canonical JSON",
    attestiaPackage: "@attestia/event-store",
    evidenceTypes: ["hash-chain", "merkle-proof"],
    status: "implemented",
    notes: "Cryptographic controls prevent retroactive modification",
  },

  // CC6 — Logical and Physical Access Controls
  {
    controlId: "CC6.1",
    controlName: "Logical Access Security",
    controlDescription:
      "The entity implements logical access security over information assets",
    attestiaControl: "API key authentication with tenant isolation",
    attestiaPackage: "@attestia/node",
    evidenceTypes: ["audit-log"],
    status: "implemented",
    notes: "Each tenant has isolated service instances with auth middleware",
  },
  {
    controlId: "CC6.3",
    controlName: "Access Control Authorization",
    controlDescription:
      "The entity authorizes, modifies, or removes access based on authorization",
    attestiaControl: "Governance quorum for policy changes",
    attestiaPackage: "@attestia/witness",
    evidenceTypes: ["multi-sig-governance", "audit-log"],
    status: "implemented",
  },

  // CC7 — System Operations
  {
    controlId: "CC7.1",
    controlName: "System Monitoring",
    controlDescription:
      "The entity monitors system components for anomalies",
    attestiaControl: "Metrics collection, rate limiting, and health endpoints",
    attestiaPackage: "@attestia/node",
    evidenceTypes: ["audit-log", "state-snapshot"],
    status: "implemented",
  },
  {
    controlId: "CC7.2",
    controlName: "Incident Response",
    controlDescription:
      "The entity monitors for and detects processing anomalies",
    attestiaControl: "Hash chain corruption detection and recovery",
    attestiaPackage: "@attestia/event-store",
    evidenceTypes: ["hash-chain", "replay-verification"],
    status: "implemented",
    notes: "Corruption recovery test suite verifies detection and re-anchoring",
  },

  // CC8 — Change Management
  {
    controlId: "CC8.1",
    controlName: "Change Management",
    controlDescription:
      "The entity manages changes to infrastructure and software",
    attestiaControl: "Event-sourced governance with version tracking",
    attestiaPackage: "@attestia/witness",
    evidenceTypes: ["multi-sig-governance", "hash-chain", "audit-log"],
    status: "implemented",
    notes: "All governance changes are event-sourced and require quorum",
  },

  // CC9 — Risk Mitigation
  {
    controlId: "CC9.1",
    controlName: "Risk Mitigation Activities",
    controlDescription:
      "The entity identifies, selects, and develops risk mitigation activities",
    attestiaControl: "Multi-chain observer with finality tracking",
    attestiaPackage: "@attestia/chain-observer",
    evidenceTypes: ["reconciliation", "state-snapshot"],
    status: "implemented",
    notes: "Chain reorg detection, finality tracking across EVM, Solana, XRPL",
  },

  // PI1 — Processing Integrity
  {
    controlId: "PI1.1",
    controlName: "Processing Completeness",
    controlDescription:
      "The entity's system processing is complete, valid, accurate, and timely",
    attestiaControl: "Deterministic replay verification against state bundle",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["replay-verification", "hash-chain", "merkle-proof"],
    status: "implemented",
    notes: "Full state can be replayed from snapshots and verified against stored hashes",
  },
  {
    controlId: "PI1.2",
    controlName: "Processing Accuracy",
    controlDescription:
      "System processing is accurate",
    attestiaControl: "Three-way reconciliation with cryptographic attestation",
    attestiaPackage: "@attestia/reconciler",
    evidenceTypes: ["reconciliation", "hash-chain", "consensus"],
    status: "implemented",
    notes: "Intent ↔ Ledger ↔ Chain reconciliation with attestation records",
  },
  {
    controlId: "PI1.3",
    controlName: "Processing Integrity Verification",
    controlDescription:
      "The entity implements procedures to verify processing integrity",
    attestiaControl: "Merkle inclusion proofs and external verification",
    attestiaPackage: "@attestia/proof",
    evidenceTypes: ["merkle-proof", "consensus", "replay-verification"],
    status: "implemented",
    notes: "Self-contained proof packages verified by third parties",
  },
  {
    controlId: "PI1.4",
    controlName: "Output Completeness and Accuracy",
    controlDescription:
      "System outputs are complete, valid, and accurate",
    attestiaControl: "Exportable state bundles with integrity verification",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["state-snapshot", "hash-chain", "replay-verification"],
    status: "implemented",
    notes: "ExportableStateBundle includes all subsystem hashes for independent verification",
  },
];
