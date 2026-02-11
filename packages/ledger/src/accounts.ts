/**
 * @attestia/ledger — Account registry.
 *
 * Manages the chart of accounts. Accounts are immutable once registered.
 * Supports the five fundamental account types with normal balance rules.
 *
 * Rules:
 * - No duplicate account IDs
 * - Account type determines normal balance (debit/credit)
 * - Once created, accounts cannot be modified or removed
 */

import type { AccountRef } from "@attestia/types";
import type { AccountType, LedgerAccount, NormalBalance } from "./types.js";
import { LedgerError, NORMAL_BALANCE } from "./types.js";

/**
 * Immutable registry of accounts.
 * Append-only: accounts can be added but never modified or removed.
 */
export class AccountRegistry {
  private readonly _accounts: Map<string, LedgerAccount> = new Map();

  /**
   * Register a new account.
   * Throws if account ID already exists.
   */
  register(ref: AccountRef, timestamp: string): LedgerAccount {
    if (this._accounts.has(ref.id)) {
      throw new LedgerError(
        "DUPLICATE_ACCOUNT_ID",
        `Account already exists: "${ref.id}"`,
      );
    }

    const account: LedgerAccount = {
      ref: { ...ref },
      createdAt: timestamp,
    };

    this._accounts.set(ref.id, account);
    return account;
  }

  /**
   * Get an account by ID.
   * Returns undefined if not found.
   */
  get(id: string): LedgerAccount | undefined {
    return this._accounts.get(id);
  }

  /**
   * Check if an account exists.
   */
  has(id: string): boolean {
    return this._accounts.has(id);
  }

  /**
   * Assert an account exists. Throws if not found.
   */
  assertExists(id: string): LedgerAccount {
    const account = this._accounts.get(id);
    if (account === undefined) {
      throw new LedgerError("UNKNOWN_ACCOUNT", `Unknown account: "${id}"`);
    }
    return account;
  }

  /**
   * Get the account type for a given account ID.
   * Throws if account not found.
   */
  getType(id: string): AccountType {
    return this.assertExists(id).ref.type;
  }

  /**
   * Get the normal balance direction for a given account ID.
   * Throws if account not found.
   */
  getNormalBalance(id: string): NormalBalance {
    return NORMAL_BALANCE[this.getType(id)];
  }

  /**
   * Get all registered accounts.
   */
  getAll(): readonly LedgerAccount[] {
    return [...this._accounts.values()];
  }

  /**
   * Get the count of registered accounts.
   */
  get count(): number {
    return this._accounts.size;
  }

  /**
   * Get all accounts of a given type.
   */
  getByType(type: AccountType): readonly LedgerAccount[] {
    return [...this._accounts.values()].filter((a) => a.ref.type === type);
  }
}
