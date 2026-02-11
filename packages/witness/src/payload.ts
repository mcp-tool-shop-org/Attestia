/**
 * Payload Builder
 *
 * Creates content-addressed attestation payloads from:
 * - Reconciliation reports (via AttestationRecord from @attestia/reconciler)
 * - Registrum state registrations
 *
 * The payload hash is SHA-256 of the canonical JSON, making it
 * content-addressable and tamper-evident.
 */

import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import type { AttestationRecord, ReconciliationReport } from "@attestia/reconciler";
import type { AttestationPayload, AttestationSource, PayloadSummary } from "./types.js";

/**
 * Build an attestation payload from a reconciliation report and its attestation record.
 */
export function buildReconciliationPayload(
  report: ReconciliationReport,
  attestation: AttestationRecord,
): AttestationPayload {
  const source: AttestationSource = {
    kind: "reconciliation",
    reportId: report.id,
    reportHash: attestation.reportHash,
  };

  const summary: PayloadSummary = {
    clean: report.summary.allReconciled,
    matchedCount: report.summary.matchedCount,
    mismatchCount: report.summary.mismatchCount,
    missingCount: report.summary.missingCount,
    attestedBy: attestation.attestedBy,
  };

  const timestamp = new Date().toISOString();

  const content = canonicalize({ source, summary, timestamp });
  const hash = sha256(content);

  return { hash, timestamp, source, summary };
}

/**
 * Build an attestation payload from a Registrum state registration.
 */
export function buildRegistrumPayload(
  stateId: string,
  orderIndex: number,
  attestedBy: string,
  summary: Partial<PayloadSummary> = {},
): AttestationPayload {
  const source: AttestationSource = {
    kind: "registrum",
    stateId,
    orderIndex,
  };

  const payloadSummary: PayloadSummary = {
    clean: summary.clean ?? true,
    matchedCount: summary.matchedCount ?? 0,
    mismatchCount: summary.mismatchCount ?? 0,
    missingCount: summary.missingCount ?? 0,
    attestedBy,
  };

  const timestamp = new Date().toISOString();

  const content = canonicalize({ source, summary: payloadSummary, timestamp });
  const hash = sha256(content);

  return { hash, timestamp, source, summary: payloadSummary };
}

/**
 * Verify a payload's hash matches its content.
 */
export function verifyPayloadHash(payload: AttestationPayload): boolean {
  const content = canonicalize({
    source: payload.source,
    summary: payload.summary,
    timestamp: payload.timestamp,
  });
  return sha256(content) === payload.hash;
}

// =============================================================================
// Internal helpers
// =============================================================================

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}
