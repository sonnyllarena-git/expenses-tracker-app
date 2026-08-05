import { create } from 'zustand';

import {
  deleteLoan,
  insertLoan,
  listLoans,
  recordLoanPayment,
  updateLoan,
  type NewLoanInput,
  type RecordLoanPaymentInput,
  type UpdateLoanInput,
} from '@/db/queries/loans';
import { refreshWallets } from '@/store/refreshWallets';
import { useExpenseStore } from '@/store/useExpenseStore';
import type { Loan } from '@/types';

interface LoanState {
  loans: Loan[];
  isLoading: boolean;
  load: (userId: string) => Promise<void>;
  addLoan: (input: NewLoanInput) => Promise<Loan>;
  editLoan: (id: string, input: UpdateLoanInput) => Promise<Loan>;
  removeLoan: (id: string) => Promise<void>;
  /** Records a payment, then refreshes expenses + wallets, both affected as a side effect. */
  makePayment: (input: RecordLoanPaymentInput) => Promise<void>;
}

export const useLoanStore = create<LoanState>((set, get) => ({
  loans: [],
  isLoading: false,
  load: async (userId: string) => {
    set({ isLoading: true });
    try {
      const loans = await listLoans(userId);
      set({ loans });
    } finally {
      set({ isLoading: false });
    }
  },
  addLoan: async (input: NewLoanInput) => {
    const loan = await insertLoan(input);
    set({ loans: [loan, ...get().loans] });
    return loan;
  },
  editLoan: async (id: string, input: UpdateLoanInput) => {
    const loan = await updateLoan(id, input);
    set({ loans: get().loans.map((existing) => (existing.id === id ? loan : existing)) });
    return loan;
  },
  removeLoan: async (id: string) => {
    await deleteLoan(id);
    set({ loans: get().loans.filter((existing) => existing.id !== id) });
  },
  makePayment: async (input: RecordLoanPaymentInput) => {
    const { loan } = await recordLoanPayment(input);
    set({ loans: get().loans.map((existing) => (existing.id === loan.id ? loan : existing)) });

    await useExpenseStore.getState().load(loan.userId);
    await refreshWallets(loan.userId);
  },
}));
