/**
 * @attestia/verify — ISO 27001 Annex A Control Mappings.
 *
 * Maps ISO/IEC 27001:2022 Annex A controls to Attestia capabilities.
 * Focus areas:
 * - A.5: Information security policies
 * - A.8: Asset management
 * - A.12: Operations security (legacy numbering for clarity)
 * - A.14: System development (legacy numbering)
 * - A.18: Compliance (legacy numbering)
 *
 * Uses ISO 27001:2022 control numbering where applicable,
 * with notes referencing legacy (2013) numbering.
 */

import type { ComplianceFramework, ControlMapping } from "./types.js";

// =============================================================================
// Framework Definition
// =============================================================================

export const ISO27001_FRAMEWORK: ComplianceFramework = {
  id: "iso27001",
  name: "ISO/IEC 27001:2022",
  version: "2022",
  description:
    "Information security management systems — Requirements, with Annex A control objectives",
};

// =============================================================================
// Control Mappings
// =============================================================================

/**
 * ISO 27001 Annex A control mappings to Attestia capabilities.
 */
export const ISO27001_MAPPINGS: readonly ControlMapping[] = [
  // A.5 — Organizational Controls
  {
    controlId: "A.5.1",
    controlName: "Policies for Information Security",
    controlDescription:
      "Information security policy and topic-specific policies shall be defined, approved, and communicated",
    attestiaControl: "Event-sourced governance policy with quorum approval",
    attestiaPackage: "@attestia/witness",
    evidenceTypes: ["multi-sig-governance", "audit-log"],
    status: "implemented",
    notes: "Governance policies are event-sourced with multi-sig approval",
  },
  {
    controlId: "A.5.2",
    controlName: "Information Security Roles",
    controlDescription:
      "Information security roles and responsibilities shall be defined and allocated",
    attestiaControl: "Tenant isolation with role-based API authentication",
    attestiaPackage: "@attestia/node",
    evidenceTypes: ["audit-log"],
    status: "implemented",
  },
  {
    controlId: "A.5.23",
    controlName: "Information Security for Cloud Services",
    controlDescription:
      "Processes for acquisition, use, management, and exit from cloud services shall be established",
    attestiaControl: "Self-contained state bundles enable cloud-independent verification",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["state-snapshot", "replay-verification"],
    status: "implemented",
    notes: "ExportableStateBundle is cloud-agnostic and independently verifiable",
  },

  // A.8 — Asset Management (ISO 27001:2022 → A.8 Technology Controls)
  {
    controlId: "A.8.1",
    controlName: "User Endpoint Devices",
    controlDescription:
      "Information stored on, processed by, or accessible via endpoint devices shall be protected",
    attestiaControl: "API-key based access control per tenant",
    attestiaPackage: "@attestia/node",
    evidenceTypes: ["audit-log"],
    status: "implemented",
  },
  {
    controlId: "A.8.9",
    controlName: "Configuration Management",
    controlDescription:
      "Configurations shall be established, documented, implemented, and monitored",
    attestiaControl: "Governance change events with version tracking",
    attestiaPackage: "@attestia/witness",
    evidenceTypes: ["multi-sig-governance", "hash-chain", "audit-log"],
    status: "implemented",
  },
  {
    controlId: "A.8.10",
    controlName: "Information Deletion",
    controlDescription:
      "Information shall be deleted when no longer required",
    attestiaControl: "Append-only event store — no deletion by design (tamper-evidence)",
    attestiaPackage: "@attestia/event-store",
    evidenceTypes: ["hash-chain"],
    status: "not-applicable",
    notes: "Attestia uses append-only storage by design; deletion would break integrity guarantees",
  },
  {
    controlId: "A.8.24",
    controlName: "Use of Cryptography",
    controlDescription:
      "Rules for effective use of cryptography shall be defined and implemented",
    attestiaControl: "SHA-256 hash chains, Merkle trees, RFC 8785 canonical JSON",
    attestiaPackage: "@attestia/proof",
    evidenceTypes: ["hash-chain", "merkle-proof"],
    status: "implemented",
    notes: "All hashing uses SHA-256 with deterministic canonical JSON serialization",
  },
  {
    controlId: "A.8.25",
    controlName: "Secure Development Life Cycle",
    controlDescription:
      "Rules for secure development shall be established and applied",
    attestiaControl: "Property-based testing, deterministic replay, type-safe APIs",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["replay-verification"],
    status: "implemented",
    notes: "1700+ automated tests including property-based and adversarial tests",
  },

  // Operations Security
  {
    controlId: "A.8.15",
    controlName: "Logging",
    controlDescription:
      "Logs that record activities, exceptions, faults, and events shall be produced and stored",
    attestiaControl: "Append-only hash-chained event store with corruption detection",
    attestiaPackage: "@attestia/event-store",
    evidenceTypes: ["hash-chain", "audit-log"],
    status: "implemented",
    notes: "All domain events are hash-chained; corruption is automatically detected",
  },
  {
    controlId: "A.8.16",
    controlName: "Monitoring Activities",
    controlDescription:
      "Networks, systems, and applications shall be monitored for anomalous behaviour",
    attestiaControl: "Metrics collection, rate limiting, and reconciliation monitoring",
    attestiaPackage: "@attestia/node",
    evidenceTypes: ["audit-log", "reconciliation"],
    status: "implemented",
  },
  {
    controlId: "A.8.17",
    controlName: "Clock Synchronization",
    controlDescription:
      "Clocks of information processing systems shall be synchronized",
    attestiaControl: "ISO 8601 timestamps on all events with chain-provided timestamps",
    attestiaPackage: "@attestia/event-store",
    evidenceTypes: ["hash-chain", "audit-log"],
    status: "implemented",
  },

  // System Integrity
  {
    controlId: "A.8.26",
    controlName: "Application Security Requirements",
    controlDescription:
      "Information security requirements shall be identified and specified for applications",
    attestiaControl: "Zod schema validation, typed API contracts, input sanitization",
    attestiaPackage: "@attestia/node",
    evidenceTypes: ["audit-log"],
    status: "implemented",
  },

  // Compliance
  {
    controlId: "A.5.36",
    controlName: "Compliance with Policies",
    controlDescription:
      "Compliance with information security policies and standards shall be regularly reviewed",
    attestiaControl: "Automated compliance evidence generation against SOC 2 and ISO 27001",
    attestiaPackage: "@attestia/verify",
    evidenceTypes: ["reconciliation", "replay-verification", "state-snapshot"],
    status: "implemented",
    notes: "Programmatic compliance reports with per-control evidence evaluation",
  },
  {
    controlId: "A.5.37",
    controlName: "Documented Operating Procedures",
    controlDescription:
      "Operating procedures shall be documented and made available",
    attestiaControl: "OpenAPI schema, structured event catalog, RFC specifications",
    attestiaPackage: "@attestia/node",
    evidenceTypes: ["audit-log"],
    status: "implemented",
    notes: "OpenAPI 3.1 schema, 31 typed event schemas, RFC documents",
  },
];
