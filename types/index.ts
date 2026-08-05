export type AccountType = 'personal' | 'family' | 'business';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export type FamilyRole = 'admin' | 'editor' | 'viewer';

export type WalletType =
  | 'gcash'
  | 'credit_card'
  | 'cash'
  | 'debit_card'
  | 'online_money'
  | 'bitcoin'
  | 'other';

export type WalletTransactionType = 'debit' | 'credit';

export interface UserAccount {
  id: string;
  email: string | null;
  accountType: AccountType;
  currency: string;
  sharingEnabled: boolean;
  notificationsEnabled: boolean;
  budgetAlertsEnabled: boolean;
  payday: number;
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  isCustom: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  addedByUserId: string | null;
  amount: number;
  categoryId: string;
  date: string;
  description: string;
  tags: string[];
  receiptPhotoPath: string | null;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  recurringTemplateId: string | null;
  budgetId: string | null;
  walletId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: string;
  isArchived: boolean;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  expenseId: string | null;
  amount: number;
  type: WalletTransactionType;
  description: string;
  date: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  month: string;
  alertThreshold: number;
  createdAt: string;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  source: string;
  date: string;
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  createdAt: string;
}

export interface Loan {
  id: string;
  userId: string;
  lenderName: string;
  principalAmount: number;
  /** Simple-interest annual rate, e.g. 0.05 for 5%. Null/0 = interest-free. */
  interestRate: number | null;
  monthlyPayment: number;
  startDate: string;
  remainingBalance: number;
  nextPaymentDate: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  joinedAt: string;
}
