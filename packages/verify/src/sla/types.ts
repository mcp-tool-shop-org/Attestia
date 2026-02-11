/**
 * SLA Policy Types.
 *
 * Types for Service Level Agreement policy definitions,
 * evaluation targets, and evaluation results.
 *
 * Design:
 * - Policies are advisory only — humans decide enforcement
 * - Pure data types, no I/O
 * - Fail-closed: missing metrics are treated as failures
 */

// =============================================================================
// Metric Types
// =============================================================================

/**
 * Known SLA metric names.
 */
export type SlaMetric =
  | "replay_time_ms"
  | "hash_chain_integrity_pct"
  | "attestation_latency_ms"
  | "verification_success_rate_pct"
  | "event_throughput_per_sec"
  | "proof_generation_ms"
  | string; // Allow custom metrics

/**
 * Comparison operator for threshold evaluation.
 */
export type ThresholdOperator = "lte" | "gte" | "lt" | "gt" | "eq";

/**
 * Time window for metric evaluation.
 */
export type SlaWindow = "1h" | "24h" | "7d" | "30d";

// =============================================================================
// Policy & Target Types
// =============================================================================

/**
 * A single SLA target — one metric with a threshold.
 */
export interface SlaTarget {
  /** The metric to evaluate */
  readonly metric: SlaMetric;
  /** Comparison operator */
  readonly operator: ThresholdOperator;
  /** Threshold value */
  readonly threshold: number;
  /** Time window for the metric */
  readonly window: SlaWindow;
  /** Human-readable description */
  readonly description?: string | undefined;
}

/**
 * An SLA policy — a named set of targets.
 */
export interface SlaPolicy {
  /** Unique policy identifier */
  readonly id: string;
  /** Human-readable policy name */
  readonly name: string;
  /** Version for tracking policy changes */
  readonly version: number;
  /** List of targets that must be met */
  readonly targets: readonly SlaTarget[];
  /** When this policy was created */
  readonly createdAt: string;
}

// =============================================================================
// Evaluation Types
// =============================================================================

/**
 * Result of evaluating a single SLA target.
 */
export interface SlaTargetResult {
  /** The target that was evaluated */
  readonly target: SlaTarget;
  /** The actual metric value (undefined if metric is missing) */
  readonly actualValue: number | undefined;
  /** Whether the target was met */
  readonly passed: boolean;
  /** Human-readable explanation */
  readonly detail: string;
}

/**
 * Overall SLA evaluation verdict.
 */
export type SlaVerdict = "PASS" | "FAIL" | "DEGRADED";

/**
 * Result of evaluating an entire SLA policy.
 */
export interface SlaEvaluation {
  /** The policy that was evaluated */
  readonly policy: SlaPolicy;
  /** Per-target results */
  readonly results: readonly SlaTargetResult[];
  /** Overall verdict: PASS if all pass, FAIL if any fail */
  readonly verdict: SlaVerdict;
  /** Number of targets that passed */
  readonly passedCount: number;
  /** Number of targets that failed */
  readonly failedCount: number;
  /** When this evaluation was performed */
  readonly evaluatedAt: string;
}

// =============================================================================
// Metrics Input
// =============================================================================

/**
 * A map of metric names to their current values.
 */
export type SlaMetrics = Readonly<Record<string, number>>;
