import { desc, eq } from 'drizzle-orm';

import { db } from '../client';
import { expenses, loans } from '../schema';
import { syncWalletForExpense, toExpense } from './expenses';
import { generateId } from '@/utils/uuid';
import { loanBalanceAfterPayment, nextLoanPaymentDate } from '@/utils/loan';
import type { Expense, Loan } from '@/types';

function toLoan(row: typeof loans.$inferSelect): Loan {
  return {
    id: row.id,
    userId: row.userId,
    lenderName: row.lenderName,
    principalAmount: row.principalAmount,
    interestRate: row.interestRate,
    monthlyPayment: row.monthlyPayment,
    startDate: row.startDate,
    remainingBalance: row.remainingBalance,
    nextPaymentDate: row.nextPaymentDate,
    notes: row.notes,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

export interface NewLoanInput {
  userId: string;
  lenderName: string;
  principalAmount: number;
  /** Simple-interest annual rate, e.g. 0.05 for 5%. Omit/null for interest-free. */
  interestRate?: number | null;
  monthlyPayment: number;
  startDate: string;
  notes?: string;
}

export async function insertLoan(input: NewLoanInput): Promise<Loan> {
  if (input.principalAmount <= 0) {
    throw new Error('Loan principal must be positive');
  }
  if (input.monthlyPayment <= 0) {
    throw new Error('Monthly payment must be positive');
  }

  const [created] = await db
    .insert(loans)
    .values({
      id: generateId(),
      userId: input.userId,
      lenderName: input.lenderName,
      principalAmount: input.principalAmount,
      interestRate: input.interestRate ?? null,
      monthlyPayment: input.monthlyPayment,
      startDate: input.startDate,
      remainingBalance: input.principalAmount,
      nextPaymentDate: nextLoanPaymentDate(input.startDate),
      notes: input.notes ?? '',
    })
    .returning();

  return toLoan(created);
}

/** All loans (active and paid-off) for the account, most recently created first. */
export async function listLoans(userId: string): Promise<Loan[]> {
  const rows = await db
    .select()
    .from(loans)
    .where(eq(loans.userId, userId))
    .orderBy(desc(loans.createdAt));
  return rows.map(toLoan);
}

export interface UpdateLoanInput {
  lenderName?: string;
  principalAmount?: number;
  interestRate?: number | null;
  monthlyPayment?: number;
  notes?: string;
  isActive?: boolean;
}

export async function updateLoan(id: string, input: UpdateLoanInput): Promise<Loan> {
  if (input.principalAmount !== undefined && input.principalAmount <= 0) {
    throw new Error('Loan principal must be positive');
  }
  if (input.monthlyPayment !== undefined && input.monthlyPayment <= 0) {
    throw new Error('Monthly payment must be positive');
  }

  const values: Partial<typeof loans.$inferInsert> = {};
  if (input.lenderName !== undefined) values.lenderName = input.lenderName;
  if (input.principalAmount !== undefined) values.principalAmount = input.principalAmount;
  if (input.interestRate !== undefined) values.interestRate = input.interestRate;
  if (input.monthlyPayment !== undefined) values.monthlyPayment = input.monthlyPayment;
  if (input.notes !== undefined) values.notes = input.notes;
  if (input.isActive !== undefined) values.isActive = input.isActive;

  const [updated] = await db.update(loans).set(values).where(eq(loans.id, id)).returning();
  if (!updated) {
    throw new Error(`No loan found with id ${id}`);
  }

  return toLoan(updated);
}

export async function deleteLoan(id: string): Promise<void> {
  await db.delete(loans).where(eq(loans.id, id));
}

export interface RecordLoanPaymentInput {
  loanId: string;
  amount: number;
  date: string;
  /** Resolved by the caller — the "Loan Payment" system category id. */
  categoryId: string;
  /** Which wallet this payment was paid from; omit for no wallet debit. */
  walletId?: string | null;
  description?: string;
}

export interface LoanPaymentResult {
  loan: Loan;
  expense: Expense;
}

/**
 * Records a loan payment: inserts an expense (category "Loan Payment", debited
 * from the given wallet exactly like a regular expense), decrements the loan's
 * remaining balance, and advances its next payment date — all atomically.
 *
 * Follows the exact same sync db.transaction() pattern as db/queries/expenses.ts
 * (see that file's WALLET INTEGRATION comment): the callback must stay a plain
 * synchronous function using .all()/.run(), never `async (tx) => { await ... }`,
 * or the transaction can commit before the writes inside it actually execute.
 */
export async function recordLoanPayment(input: RecordLoanPaymentInput): Promise<LoanPaymentResult> {
  if (input.amount <= 0) {
    throw new Error('Payment amount must be positive');
  }

  const result = db.transaction((tx) => {
    const [loanRow] = tx.select().from(loans).where(eq(loans.id, input.loanId)).all();
    if (!loanRow) {
      throw new Error(`No loan found with id ${input.loanId}`);
    }

    const nextBalance = loanBalanceAfterPayment(loanRow.remainingBalance, input.amount);
    const nextDue = nextLoanPaymentDate(loanRow.nextPaymentDate);
    const description = input.description ?? `Loan payment - ${loanRow.lenderName}`;

    const [updatedLoan] = tx
      .update(loans)
      .set({
        remainingBalance: nextBalance,
        nextPaymentDate: nextDue,
        isActive: nextBalance > 0,
      })
      .where(eq(loans.id, input.loanId))
      .returning()
      .all();

    const [expenseRow] = tx
      .insert(expenses)
      .values({
        id: generateId(),
        userId: loanRow.userId,
        amount: input.amount,
        categoryId: input.categoryId,
        date: input.date,
        description,
        tags: JSON.stringify([]),
        isRecurring: false,
        walletId: input.walletId ?? null,
      })
      .returning()
      .all();

    if (input.walletId) {
      syncWalletForExpense(tx, expenseRow.id, {
        walletId: input.walletId,
        amount: input.amount,
        date: input.date,
        description,
      });
    }

    return { loan: updatedLoan, expense: expenseRow };
  });

  return { loan: toLoan(result.loan), expense: toExpense(result.expense) };
}
