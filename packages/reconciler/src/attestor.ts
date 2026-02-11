/**
 * Attestor
 *
 * Registers reconciliation results as State transitions in Registrum.
 * This creates an immutable, auditable record of every reconciliation run.
 *
 * Each reconciliation report becomes a Registrum State, and successive
 * reconciliations form a lineage chain.
 */

import { createHash } from "node:crypto";
import type { Registrar, RegistrationResult, State, Transition } from "@attestia/registrum";
import type { AttestationRecord, ReconciliationReport } from "./types.js";

export class Attestor {
  private readonly registrar: Registrar;
  private readonly attestorId: string;
  private readonly stateId: string;
  private lastStateId: string | null = null;

  constructor(registrar: Registrar, attestorId: string) {
    this.registrar = registrar;
    this.attestorId = attestorId;
    this.stateId = `attestation:${attestorId}`;
  }

  /**
   * Attest a reconciliation report by registering it as a State in Registrum.
   *
   * The report becomes the State's data (opaque to Registrum).
   * The structure fields carry the reconciliation summary for invariant checking.
   *
   * All attestations for this attestor share the same state ID —
   * each new attestation is a transition (update) of that state.
   */
  async attest(report: ReconciliationReport): Promise<AttestationRecord> {
    const reportHash = this.hashReport(report);
    const attestedAt = new Date().toISOString();

    const state: State = {
      id: this.stateId,
      structure: {
        ...(this.lastStateId === null ? { isRoot: true } : {}),
        type: "reconciliation-attestation",
        reconciliationId: report.id,
        allReconciled: report.summary.allReconciled,
        matchedCount: report.summary.matchedCount,
        mismatchCount: report.summary.mismatchCount,
        missingCount: report.summary.missingCount,
        reportHash,
        attestedBy: this.attestorId,
        attestedAt,
      },
      data: report,
    };

    const transition: Transition = {
      from: this.lastStateId,
      to: state,
      metadata: {
        action: "reconciliation-attestation",
        attestorId: this.attestorId,
        timestamp: attestedAt,
      },
    };

    const result: RegistrationResult = this.registrar.register(transition);

    if (result.kind === "rejected") {
      throw new Error(
        `Attestation rejected by Registrum: ${result.violations.map((v) => v.message).join("; ")}`,
      );
    }

    this.lastStateId = result.stateId;

    return {
      id: `att:${report.id}`,
      reconciliationId: report.id,
      allReconciled: report.summary.allReconciled,
      summary: report.summary,
      attestedBy: this.attestorId,
      attestedAt,
      reportHash,
    };
  }

  /**
   * Get the last registered attestation state ID.
   * Returns null if no attestations have been made.
   */
  getLastStateId(): string | null {
    return this.lastStateId;
  }

  /**
   * Hash a reconciliation report for integrity verification.
   * Uses SHA-256 over the deterministic JSON representation.
   */
  private hashReport(report: ReconciliationReport): string {
    const json = JSON.stringify(report);
    return createHash("sha256").update(json).digest("hex");
  }
}
