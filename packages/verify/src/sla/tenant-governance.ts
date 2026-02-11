/**
 * Tenant Governance Policy.
 *
 * Manages per-tenant governance policies including SLA assignments,
 * tenant lifecycle (creation, suspension), and action validation.
 *
 * Design:
 * - Pure functions for validation
 * - Stateless: policies are passed in, not stored
 * - Fail-closed: suspended tenants are always blocked
 */

import type { SlaPolicy } from "./types.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Tenant status in the governance system.
 */
export type TenantStatus = "active" | "suspended";

/**
 * A tenant's governance policy.
 */
export interface TenantGovernancePolicy {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly status: TenantStatus;
  readonly slaPolicy: SlaPolicy | null;
  readonly governancePolicyId: string | null;
  readonly createdAt: string;
  readonly suspendedAt?: string | undefined;
  readonly suspendedReason?: string | undefined;
}

/**
 * Actions that can be validated against tenant governance.
 */
export type TenantAction =
  | "declare_intent"
  | "approve_intent"
  | "execute_intent"
  | "export_state"
  | "generate_proof"
  | "submit_verification";

/**
 * Result of a tenant governance validation.
 */
export interface TenantGovernanceResult {
  readonly allowed: boolean;
  readonly reason: string;
  readonly tenantId: string;
  readonly action: TenantAction;
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a new tenant governance policy.
 */
export function createTenantGovernancePolicy(
  tenantId: string,
  tenantName: string,
  slaPolicy?: SlaPolicy,
  governancePolicyId?: string,
): TenantGovernancePolicy {
  if (tenantId.length === 0) {
    throw new Error("Tenant ID cannot be empty");
  }
  if (tenantName.length === 0) {
    throw new Error("Tenant name cannot be empty");
  }

  return {
    tenantId,
    tenantName,
    status: "active",
    slaPolicy: slaPolicy ?? null,
    governancePolicyId: governancePolicyId ?? null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Suspend a tenant's governance policy.
 */
export function suspendTenant(
  policy: TenantGovernancePolicy,
  reason: string,
): TenantGovernancePolicy {
  if (policy.status === "suspended") {
    throw new Error(`Tenant ${policy.tenantId} is already suspended`);
  }
  if (reason.length === 0) {
    throw new Error("Suspension reason cannot be empty");
  }

  return {
    ...policy,
    status: "suspended",
    suspendedAt: new Date().toISOString(),
    suspendedReason: reason,
  };
}

/**
 * Reactivate a suspended tenant.
 */
export function reactivateTenant(
  policy: TenantGovernancePolicy,
): TenantGovernancePolicy {
  if (policy.status === "active") {
    throw new Error(`Tenant ${policy.tenantId} is already active`);
  }

  return {
    ...policy,
    status: "active",
    suspendedAt: undefined,
    suspendedReason: undefined,
  };
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate whether a tenant is allowed to perform an action.
 *
 * Fail-closed:
 * - Suspended tenants are always blocked
 * - Active tenants are allowed by default
 *
 * @param tenant The tenant's governance policy
 * @param action The action to validate
 * @returns Validation result with allowed/denied and reason
 */
export function validateTenantGovernance(
  tenant: TenantGovernancePolicy,
  action: TenantAction,
): TenantGovernanceResult {
  // Fail-closed: suspended tenants cannot perform any action
  if (tenant.status === "suspended") {
    return {
      allowed: false,
      reason: `Tenant ${tenant.tenantId} is suspended: ${tenant.suspendedReason ?? "no reason provided"}`,
      tenantId: tenant.tenantId,
      action,
    };
  }

  // Active tenants are allowed
  return {
    allowed: true,
    reason: `Tenant ${tenant.tenantId} is active and authorized for ${action}`,
    tenantId: tenant.tenantId,
    action,
  };
}

/**
 * Assign an SLA policy to a tenant.
 */
export function assignSlaPolicy(
  tenant: TenantGovernancePolicy,
  slaPolicy: SlaPolicy,
): TenantGovernancePolicy {
  return {
    ...tenant,
    slaPolicy,
  };
}
