import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  accountType: text('account_type').notNull(),
  currency: text('currency').notNull().default('PHP'),
  sharingEnabled: integer('sharing_enabled', { mode: 'boolean' }).notNull().default(false),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  budgetAlertsEnabled: integer('budget_alerts_enabled', { mode: 'boolean' })
    .notNull()
    .default(true),
  // Day of month salary/income typically lands, 1-31; clamped to the last
  // day of shorter months at read time (see utils/date.ts's daysUntilPayday).
  payday: integer('payday').notNull().default(25),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    limitAmount: real('limit_amount').notNull(),
    month: text('month').notNull(),
    alertThreshold: real('alert_threshold').notNull().default(0.8),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index('idx_budgets_user_month').on(table.userId, table.month)]
);

export const wallets = sqliteTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  // WalletType union (types/index.ts) stored as free text — no DB-level enum in SQLite.
  type: text('type').notNull(),
  balance: real('balance').notNull(),
  currency: text('currency').notNull().default('PHP'),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const expenses = sqliteTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    // Which family member logged this expense. Only meaningful for account_type = 'family'.
    addedByUserId: text('added_by_user_id').references(() => users.id),
    amount: real('amount').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    date: text('date').notNull(),
    description: text('description').notNull().default(''),
    // SQLite has no array type; stored as a JSON-encoded string array.
    tags: text('tags').notNull().default('[]'),
    receiptPhotoPath: text('receipt_photo_path'),
    isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
    recurringFrequency: text('recurring_frequency'),
    // Set on rows materialized from a recurring template; points back at the template row.
    recurringTemplateId: text('recurring_template_id'),
    budgetId: text('budget_id').references(() => budgets.id),
    // Nullable — which wallet this was paid from; omitted for quick entries and all
    // pre-existing expenses. See db/queries/expenses.ts for the balance-sync logic.
    walletId: text('wallet_id').references(() => wallets.id),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index('idx_expenses_user_date').on(table.userId, table.date),
    index('idx_expenses_user_category').on(table.userId, table.categoryId),
  ]
);

export const walletTransactions = sqliteTable(
  'wallet_transactions',
  {
    id: text('id').primaryKey(),
    walletId: text('wallet_id')
      .notNull()
      .references(() => wallets.id),
    // Set for transactions created from an expense; null for manual balance adjustments.
    expenseId: text('expense_id').references(() => expenses.id),
    amount: real('amount').notNull(),
    // 'debit' reduces the wallet balance, 'credit' increases it.
    type: text('type').notNull(),
    description: text('description').notNull().default(''),
    date: text('date').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index('idx_wallet_transactions_wallet').on(table.walletId)]
);

export const income = sqliteTable(
  'income',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    amount: real('amount').notNull(),
    source: text('source').notNull().default(''),
    date: text('date').notNull(),
    isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
    recurringFrequency: text('recurring_frequency'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index('idx_income_user_date').on(table.userId, table.date)]
);

export const loans = sqliteTable(
  'loans',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    lenderName: text('lender_name').notNull(),
    principalAmount: real('principal_amount').notNull(),
    // Simple-interest annual rate, e.g. 0.05 for 5%. Null/0 = interest-free.
    interestRate: real('interest_rate'),
    monthlyPayment: real('monthly_payment').notNull(),
    startDate: text('start_date').notNull(),
    remainingBalance: real('remaining_balance').notNull(),
    nextPaymentDate: text('next_payment_date').notNull(),
    notes: text('notes').notNull().default(''),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index('idx_loans_user_active').on(table.userId, table.isActive)]
);

export const familyMembers = sqliteTable('family_members', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  role: text('role').notNull(),
  joinedAt: text('joined_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});
