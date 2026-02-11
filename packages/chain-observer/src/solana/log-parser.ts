/**
 * Solana Program Log Parser
 *
 * Extracts structured information from Solana program logs.
 * Solana programs emit logs via `msg!()` and `emit!()` macros,
 * and the runtime adds invocation/CPI markers.
 *
 * Log format conventions:
 * - "Program <id> invoke [<depth>]" — program invocation
 * - "Program <id> success" — program completed successfully
 * - "Program <id> failed: <reason>" — program failed
 * - "Program log: <message>" — user-space log message
 * - "Program data: <base64>" — serialized event data
 * - "Transfer: <lamports> lamports" — native transfer log
 *
 * Rules:
 * - Pure function — no side effects
 * - All return types are readonly
 * - No network calls — parsing only
 */

// =============================================================================
// Types
// =============================================================================

/**
 * A parsed log event from Solana program logs.
 */
export interface ParsedLogEvent {
  /** The program ID that emitted this log */
  readonly programId: string;

  /** Nesting depth (1 = top-level, 2+ = CPI) */
  readonly depth: number;

  /** Type of log event */
  readonly type: "invoke" | "success" | "failure" | "log" | "data";

  /** The raw log message */
  readonly message: string;

  /** For "data" type: the base64-encoded event data */
  readonly data?: string;

  /** For "failure" type: the error reason */
  readonly error?: string;
}

// =============================================================================
// Parser
// =============================================================================

/** Regex patterns for Solana log lines */
const INVOKE_PATTERN = /^Program (\S+) invoke \[(\d+)\]$/;
const SUCCESS_PATTERN = /^Program (\S+) success$/;
const FAILURE_PATTERN = /^Program (\S+) failed: (.+)$/;
const LOG_PATTERN = /^Program log: (.+)$/;
const DATA_PATTERN = /^Program data: (.+)$/;

/**
 * Parse Solana program logs into structured events.
 *
 * @param logs Raw log strings from a Solana transaction
 * @returns Array of parsed log events in order
 */
export function parseProgramLogs(logs: readonly string[]): readonly ParsedLogEvent[] {
  const events: ParsedLogEvent[] = [];
  const programStack: string[] = [];

  for (const line of logs) {
    const invokeMatch = INVOKE_PATTERN.exec(line);
    if (invokeMatch) {
      const programId = invokeMatch[1]!;
      const depth = parseInt(invokeMatch[2]!, 10);
      programStack.push(programId);
      events.push({ programId, depth, type: "invoke", message: line });
      continue;
    }

    const successMatch = SUCCESS_PATTERN.exec(line);
    if (successMatch) {
      const programId = successMatch[1]!;
      programStack.pop();
      events.push({
        programId,
        depth: programStack.length + 1,
        type: "success",
        message: line,
      });
      continue;
    }

    const failureMatch = FAILURE_PATTERN.exec(line);
    if (failureMatch) {
      const programId = failureMatch[1]!;
      const error = failureMatch[2]!;
      programStack.pop();
      events.push({
        programId,
        depth: programStack.length + 1,
        type: "failure",
        message: line,
        error,
      });
      continue;
    }

    const dataMatch = DATA_PATTERN.exec(line);
    if (dataMatch) {
      const currentProgram = programStack[programStack.length - 1] ?? "unknown";
      events.push({
        programId: currentProgram,
        depth: programStack.length,
        type: "data",
        message: line,
        data: dataMatch[1]!,
      });
      continue;
    }

    const logMatch = LOG_PATTERN.exec(line);
    if (logMatch) {
      const currentProgram = programStack[programStack.length - 1] ?? "unknown";
      events.push({
        programId: currentProgram,
        depth: programStack.length,
        type: "log",
        message: line,
      });
      continue;
    }
  }

  return events;
}
