/**
 * Request/Response DTOs with Zod validation schemas.
 *
 * Each DTO has a Zod schema and a derived TypeScript type.
 * Route handlers use these for body/query validation.
 */

import { z } from "zod";

// =============================================================================
// Shared Schemas
// =============================================================================

export const MoneySchema = z.object({
  amount: z.string().min(1),
  currency: z.string().min(1),
  decimals: z.number().int().min(0).max(18),
});

export const PaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Intent DTOs
// =============================================================================

export const DeclareIntentSchema = z.object({
  id: z.string().min(1).max(128),
  kind: z.enum([
    "transfer",
    "swap",
    "allocate",
    "deallocate",
    "bridge",
    "stake",
    "unstake",
  ]),
  description: z.string().min(1).max(1024),
  params: z.object({
    fromChainId: z.string().optional(),
    toChainId: z.string().optional(),
    fromAddress: z.string().optional(),
    toAddress: z.string().optional(),
    amount: MoneySchema.optional(),
    receiveToken: z.string().optional(),
    extra: z.record(z.unknown()).optional(),
  }),
  envelopeId: z.string().optional(),
});

export type DeclareIntentDto = z.infer<typeof DeclareIntentSchema>;

export const ApproveIntentSchema = z.object({
  reason: z.string().optional(),
});

export type ApproveIntentDto = z.infer<typeof ApproveIntentSchema>;

export const RejectIntentSchema = z.object({
  reason: z.string().min(1),
});

export type RejectIntentDto = z.infer<typeof RejectIntentSchema>;

export const ExecuteIntentSchema = z.object({
  chainId: z.string().min(1),
  txHash: z.string().min(1),
});

export type ExecuteIntentDto = z.infer<typeof ExecuteIntentSchema>;

export const VerifyIntentSchema = z.object({
  matched: z.boolean(),
  discrepancies: z.array(z.string()).optional(),
});

export type VerifyIntentDto = z.infer<typeof VerifyIntentSchema>;

export const ListIntentsQuerySchema = PaginationQuerySchema.extend({
  status: z.string().optional(),
});

export type ListIntentsQuery = z.infer<typeof ListIntentsQuerySchema>;

// =============================================================================
// Event DTOs
// =============================================================================

export const ListEventsQuerySchema = PaginationQuerySchema.extend({
  afterPosition: z.coerce.number().int().min(0).optional(),
});

export type ListEventsQuery = z.infer<typeof ListEventsQuerySchema>;

export const ListStreamEventsQuerySchema = PaginationQuerySchema.extend({
  afterVersion: z.coerce.number().int().min(0).optional(),
});

export type ListStreamEventsQuery = z.infer<typeof ListStreamEventsQuerySchema>;

// =============================================================================
// Verification DTOs
// =============================================================================

export const ReplayVerifySchema = z.object({
  ledgerSnapshot: z.record(z.unknown()),
  registrumSnapshot: z.record(z.unknown()),
  expectedHash: z.string().optional(),
});

export type ReplayVerifyDto = z.infer<typeof ReplayVerifySchema>;

export const HashVerifySchema = z.object({
  ledgerSnapshot: z.record(z.unknown()),
  registrumSnapshot: z.record(z.unknown()),
  expectedHash: z.string().min(1),
});

export type HashVerifyDto = z.infer<typeof HashVerifySchema>;

// =============================================================================
// Reconciliation DTOs
// =============================================================================

export const ReconcileSchema = z.object({
  intents: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      kind: z.string(),
      amount: MoneySchema.optional(),
      envelopeId: z.string().optional(),
      chainId: z.string().optional(),
      txHash: z.string().optional(),
      declaredAt: z.string(),
      correlationId: z.string().optional(),
    }),
  ),
  ledgerEntries: z.array(
    z.object({
      id: z.string(),
      accountId: z.string(),
      type: z.enum(["debit", "credit"]),
      money: MoneySchema,
      timestamp: z.string(),
      intentId: z.string().optional(),
      txHash: z.string().optional(),
      correlationId: z.string(),
    }),
  ),
  chainEvents: z.array(
    z.object({
      chainId: z.string(),
      txHash: z.string(),
      from: z.string(),
      to: z.string(),
      amount: z.string(),
      decimals: z.number(),
      symbol: z.string(),
      timestamp: z.string(),
    }),
  ),
  scope: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
      intentId: z.string().optional(),
      chainId: z.string().optional(),
      correlationId: z.string().optional(),
    })
    .optional(),
});

export type ReconcileDto = z.infer<typeof ReconcileSchema>;
