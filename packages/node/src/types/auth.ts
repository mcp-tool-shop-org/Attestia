/**
 * Authentication and authorization types.
 *
 * Supports two auth strategies:
 * 1. API key via X-Api-Key header
 * 2. JWT bearer token via Authorization header
 *
 * Role hierarchy: admin > operator > viewer
 */

// =============================================================================
// Roles & Permissions
// =============================================================================

export type Role = "admin" | "operator" | "viewer";

/** Permission levels for role-based access control */
export type Permission = "read" | "write" | "admin";

/** Which permissions each role grants */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  viewer: ["read"],
  operator: ["read", "write"],
  admin: ["read", "write", "admin"],
};

/**
 * Check whether a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// =============================================================================
// Auth Context
// =============================================================================

/**
 * Resolved authentication context, set by the auth middleware.
 */
export interface AuthContext {
  readonly type: "api-key" | "jwt";
  readonly identity: string;
  readonly role: Role;
  readonly tenantId: string;
}

// =============================================================================
// API Key Record
// =============================================================================

export interface ApiKeyRecord {
  readonly key: string;
  readonly role: Role;
  readonly tenantId: string;
}

// =============================================================================
// JWT Claims
// =============================================================================

export interface JwtClaims {
  readonly sub: string;
  readonly role: Role;
  readonly tenantId: string;
  readonly iss: string;
  readonly exp: number;
  readonly iat: number;
}
