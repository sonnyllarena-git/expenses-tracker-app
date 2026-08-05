import { nextOccurrenceDate } from '@/utils/date';

/**
 * Simple interest only: interest = principal × rate × time (years).
 * A null/zero rate is treated as interest-free (per the Weeks 9-10 spec).
 */
export function simpleInterestAmount(
  principal: number,
  rate: number | null,
  timeYears: number
): number {
  if (!rate) {
    return 0;
  }
  return principal * rate * timeYears;
}

/** Clamped at 0 — a payment can never take a loan's remaining balance negative. */
export function loanBalanceAfterPayment(remainingBalance: number, paymentAmount: number): number {
  return Math.max(0, remainingBalance - paymentAmount);
}

/** Fraction of the original principal paid off so far, clamped to [0, 1]. */
export function loanProgress(principalAmount: number, remainingBalance: number): number {
  if (principalAmount <= 0) {
    return 1;
  }
  const paid = principalAmount - remainingBalance;
  return Math.min(1, Math.max(0, paid / principalAmount));
}

/** Loan payments are always monthly (per the Weeks 9-10 spec). */
export function nextLoanPaymentDate(currentDueDate: string): string {
  return nextOccurrenceDate(currentDueDate, 'monthly');
}
