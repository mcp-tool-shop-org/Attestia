/**
 * Intent Types
 *
 * The universal interaction pattern: Intent → Approve → Execute → Verify.
 * An Intent captures a desired outcome before it becomes reality.
 *
 * Intents are:
 * - Declarative (what, not how)
 * - Approvable (require human sign-off)
 * - Traceable (every state change is recorded)
 * - Verifiable (post-execution reconciliation)
 */

/**
 * Lifecycle states of an Intent.
 */
export type IntentStatus =
  | "declared"
  | "approved"
  | "rejected"
  | "executing"
  | "executed"
  | "verified"
  | "failed";

/**
 * An Intent is a proposed financial action.
 * It captures the user's desired outcome without executing it.
 */
export interface Intent {
  /** Unique identifier for this intent */
  readonly id: string;

  /** Current lifecycle state */
  readonly status: IntentStatus;

  /** What kind of intent (transfer, allocation, distribution, etc.) */
  readonly kind: string;

  /** Human-readable description of the desired outcome */
  readonly description: string;

  /** Who declared this intent */
  readonly declaredBy: string;

  /** ISO 8601 timestamp of declaration */
  readonly declaredAt: string;

  /** Structured parameters (intent-kind-specific, opaque to the framework) */
  readonly params: Readonly<Record<string, unknown>>;
}

/**
 * Record of an intent being declared.
 */
export interface IntentDeclaration {
  readonly intentId: string;
  readonly declaredBy: string;
  readonly declaredAt: string;
  readonly kind: string;
  readonly params: Readonly<Record<string, unknown>>;
}

/**
 * Record of an intent being approved or rejected.
 */
export interface IntentApproval {
  readonly intentId: string;
  readonly approvedBy: string;
  readonly approvedAt: string;
  readonly approved: boolean;
  readonly reason?: string;
}

/**
 * Record of an intent being executed on-chain.
 */
export interface IntentExecution {
  readonly intentId: string;
  readonly executedAt: string;
  readonly chainId: string;
  readonly txHash: string;
}

/**
 * Record of post-execution verification.
 */
export interface IntentVerification {
  readonly intentId: string;
  readonly verifiedAt: string;
  readonly matched: boolean;
  readonly discrepancies?: readonly string[];
}
