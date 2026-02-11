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
