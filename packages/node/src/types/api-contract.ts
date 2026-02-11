/**
 * Hono application environment type.
 *
 * Defines the typed context variables available in all route handlers.
 * These are set by middleware and consumed by route handlers.
 */

import type { AttestiaService } from "../services/attestia-service.js";
import type { AuthContext } from "./auth.js";

/**
 * Hono environment type for the Attestia app.
 *
 * Middleware populates Variables; route handlers read them via c.get().
 */
export interface AppEnv {
  Variables: {
    /** Unique request identifier (set by request-id middleware) */
    requestId: string;

    /** Resolved AttestiaService for the current tenant (set by tenant middleware) */
    service: AttestiaService;

    /** Authentication context (set by auth middleware) */
    auth: AuthContext;
  };
}
