/**
 * Type barrel — re-exports all public types from @attestia/node.
 */

// DTOs
export {
  MoneySchema,
  PaginationQuerySchema,
  DeclareIntentSchema,
  ApproveIntentSchema,
  RejectIntentSchema,
  ExecuteIntentSchema,
  VerifyIntentSchema,
  ListIntentsQuerySchema,
  ListEventsQuerySchema,
  ListStreamEventsQuerySchema,
  ReplayVerifySchema,
  HashVerifySchema,
  ReconcileSchema,
} from "./dto.js";
export type {
  DeclareIntentDto,
  ApproveIntentDto,
  RejectIntentDto,
  ExecuteIntentDto,
  VerifyIntentDto,
  ListIntentsQuery,
  ListEventsQuery,
  ListStreamEventsQuery,
  ReplayVerifyDto,
  HashVerifyDto,
  ReconcileDto,
} from "./dto.js";

// Error
export { createErrorEnvelope } from "./error.js";
export type { ApiErrorCode, ErrorDetail, ErrorEnvelope } from "./error.js";

// Pagination
export { encodeCursor, decodeCursor, paginate } from "./pagination.js";
export type {
  PaginationQuery,
  PaginationMeta,
  PaginatedResponse,
} from "./pagination.js";

// Auth
export { ROLE_PERMISSIONS, hasPermission } from "./auth.js";
export type {
  Role,
  Permission,
  AuthContext,
  ApiKeyRecord,
  JwtClaims,
} from "./auth.js";

// App env
export type { AppEnv } from "./api-contract.js";
