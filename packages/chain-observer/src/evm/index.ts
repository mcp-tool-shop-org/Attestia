/**
 * EVM Observer — Public API
 */
export { EvmObserver } from "./evm-observer.js";
export {
  normalizeL2Gas,
  extractL2ReceiptFields,
  isOpStackChain,
  isArbitrumChain,
  isL2Chain,
} from "./l2-adapter.js";
export type { NormalizedGas, L2ReceiptFields } from "./l2-adapter.js";
export { ReorgDetector, canonicalTxKey } from "./reorg-detector.js";
export type { BlockRecord, L2ReorgDetectedPayload } from "./reorg-detector.js";
