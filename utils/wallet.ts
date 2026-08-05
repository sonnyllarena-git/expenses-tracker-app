export interface WalletBalanceAdjustment {
  walletId: string;
  /** Signed amount to ADD to the wallet's balance (negative = debit). */
  delta: number;
}

/**
 * Computes the wallet balance adjustments needed to move an expense from its
 * previous (wallet, amount) pairing to its next one. Always reverses the
 * previous linked transaction in full (credits its amount back) and applies
 * a fresh debit for the next state, rather than computing an incremental
 * diff between the two — insert/update/delete all funnel through this same
 * function so there's exactly one place balance math can go wrong, not
 * three slightly-different ones.
 *
 * Pass `previous: null` for a brand-new expense (nothing to reverse) and
 * `next: null` when the expense has no wallet after the change (nothing to
 * (re)apply) — e.g. deletion, or a wallet being cleared from an expense.
 */
export function walletBalanceAdjustments(
  previous: { walletId: string; amount: number } | null,
  next: { walletId: string; amount: number } | null
): WalletBalanceAdjustment[] {
  const adjustments: WalletBalanceAdjustment[] = [];
  if (previous) {
    adjustments.push({ walletId: previous.walletId, delta: previous.amount });
  }
  if (next) {
    adjustments.push({ walletId: next.walletId, delta: -next.amount });
  }
  return adjustments;
}
