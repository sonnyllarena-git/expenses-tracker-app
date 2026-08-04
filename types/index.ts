export type AccountType = 'personal' | 'family' | 'business';

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export type FamilyRole = 'admin' | 'editor' | 'viewer';

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
  createdAt: string;
  updatedAt: string;
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

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  joinedAt: string;
}
