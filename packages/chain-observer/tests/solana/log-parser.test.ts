/**
 * Tests for Solana program log parser.
 */

import { describe, it, expect } from "vitest";
import { parseProgramLogs } from "../../src/solana/log-parser.js";

describe("parseProgramLogs", () => {
  it("parses empty logs", () => {
    expect(parseProgramLogs([])).toEqual([]);
  });

  it("parses a simple program invocation and success", () => {
    const logs = [
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    ];

    const events = parseProgramLogs(logs);

    expect(events).toHaveLength(3);
    expect(events[0]!.type).toBe("invoke");
    expect(events[0]!.programId).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    expect(events[0]!.depth).toBe(1);

    expect(events[1]!.type).toBe("log");
    expect(events[1]!.programId).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
    expect(events[1]!.depth).toBe(1);

    expect(events[2]!.type).toBe("success");
    expect(events[2]!.programId).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });

  it("parses nested CPI invocations", () => {
    const logs = [
      "Program JUP6LkMUJKzzU56npMBrJpGFQr6oZp9KBecXXQzXump invoke [1]",
      "Program log: Instruction: Route",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [2]",
      "Program log: Instruction: Transfer",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
      "Program JUP6LkMUJKzzU56npMBrJpGFQr6oZp9KBecXXQzXump success",
    ];

    const events = parseProgramLogs(logs);

    expect(events).toHaveLength(6);

    // Top-level invoke
    expect(events[0]!.depth).toBe(1);
    expect(events[0]!.programId).toBe("JUP6LkMUJKzzU56npMBrJpGFQr6oZp9KBecXXQzXump");

    // CPI invoke
    expect(events[2]!.depth).toBe(2);
    expect(events[2]!.programId).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

    // CPI log is at depth 2
    expect(events[3]!.depth).toBe(2);

    // CPI success
    expect(events[4]!.type).toBe("success");
    expect(events[4]!.programId).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });

  it("parses program failure", () => {
    const logs = [
      "Program 11111111111111111111111111111111 invoke [1]",
      "Program 11111111111111111111111111111111 failed: custom program error: 0x1",
    ];

    const events = parseProgramLogs(logs);

    expect(events).toHaveLength(2);
    expect(events[1]!.type).toBe("failure");
    expect(events[1]!.error).toBe("custom program error: 0x1");
  });

  it("parses program data events (base64)", () => {
    const logs = [
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
      "Program data: SGVsbG8gV29ybGQ=",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    ];

    const events = parseProgramLogs(logs);

    expect(events).toHaveLength(3);
    expect(events[1]!.type).toBe("data");
    expect(events[1]!.data).toBe("SGVsbG8gV29ybGQ=");
    expect(events[1]!.programId).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });

  it("is deterministic — same input produces same output", () => {
    const logs = [
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
      "Program log: Instruction: Transfer",
      "Program data: dGVzdA==",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    ];

    const result1 = parseProgramLogs(logs);
    const result2 = parseProgramLogs(logs);

    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  it("handles logs with unknown format gracefully", () => {
    const logs = [
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
      "Some unknown log format that doesn't match any pattern",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    ];

    const events = parseProgramLogs(logs);

    // Unknown lines are skipped
    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe("invoke");
    expect(events[1]!.type).toBe("success");
  });

  it("handles multiple top-level programs", () => {
    const logs = [
      "Program 11111111111111111111111111111111 invoke [1]",
      "Program 11111111111111111111111111111111 success",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA invoke [1]",
      "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA success",
    ];

    const events = parseProgramLogs(logs);

    expect(events).toHaveLength(4);
    expect(events[0]!.programId).toBe("11111111111111111111111111111111");
    expect(events[2]!.programId).toBe("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
  });
});
