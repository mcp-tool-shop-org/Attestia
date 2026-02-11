/**
 * Solana observer module.
 *
 * Re-exports the SolanaObserver and configuration types.
 */

export { SolanaObserver } from "./solana-observer.js";
export type { SolanaRpcConfig } from "./rpc-config.js";
export { DEFAULT_SOLANA_RPC_CONFIG } from "./rpc-config.js";
export { parseProgramLogs } from "./log-parser.js";
export type { ParsedLogEvent } from "./log-parser.js";
