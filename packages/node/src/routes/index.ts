/**
 * Route barrel — re-exports all route modules.
 */

export { createHealthRoutes } from "./health.js";
export { createIntentRoutes } from "./intents.js";
export { createEventRoutes } from "./events.js";
export { createVerifyRoutes } from "./verify.js";
export { createAttestationRoutes } from "./attestation.js";
export { createMetricsRoute } from "./metrics.js";
