/**
 * Multi-Sig Witness Governance — Public API
 */
export { GovernanceStore } from "./governance-store.js";
export {
  buildCanonicalSigningPayload,
  orderSignatures,
  aggregateSignatures,
} from "./signing.js";
export type { SignerSignature, AggregatedSignature } from "./signing.js";
export type {
  SignerEntry,
  GovernancePolicy,
  GovernanceChangeEvent,
  SignerAddedEvent,
  SignerRemovedEvent,
  QuorumChangedEvent,
  PolicyRotatedEvent,
  QuorumResult,
} from "./types.js";
export {
  isSignerAddedEvent,
  isSignerRemovedEvent,
  isQuorumChangedEvent,
  isPolicyRotatedEvent,
} from "./types.js";
