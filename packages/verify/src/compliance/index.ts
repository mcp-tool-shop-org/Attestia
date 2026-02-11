/**
 * @attestia/verify — Compliance module.
 *
 * Framework mappings and evidence generation for regulatory compliance.
 */

// Types
export type {
  ComplianceFramework,
  EvidenceType,
  ControlStatus,
  ControlMapping,
  EvaluatedControl,
  ComplianceReport,
} from "./types.js";

// SOC 2
export { SOC2_FRAMEWORK, SOC2_MAPPINGS } from "./soc2-mapping.js";
