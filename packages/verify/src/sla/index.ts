/**
 * SLA module — policy types and evaluation engine.
 */

// Types
export type {
  SlaMetric,
  ThresholdOperator,
  SlaWindow,
  SlaTarget,
  SlaPolicy,
  SlaTargetResult,
  SlaVerdict,
  SlaEvaluation,
  SlaMetrics,
} from "./types.js";

// Engine
export { evaluateSla, evaluateMultipleSla } from "./sla-engine.js";

// Tenant Governance
export {
  createTenantGovernancePolicy,
  suspendTenant,
  reactivateTenant,
  validateTenantGovernance,
  assignSlaPolicy,
} from "./tenant-governance.js";

export type {
  TenantStatus,
  TenantGovernancePolicy,
  TenantAction,
  TenantGovernanceResult,
} from "./tenant-governance.js";
