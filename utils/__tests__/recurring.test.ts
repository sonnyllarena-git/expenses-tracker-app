import { recurringStatus } from '../recurring';
import type { Expense } from '@/types';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: 'expense-id',
    userId: 'user-1',
    addedByUserId: null,
    amount: 100,
    categoryId: 'cat-food',
    date: '2026-08-01',
    description: '',
    tags: [],
    receiptPhotoPath: null,
    isRecurring: false,
    recurringFrequency: null,
    recurringTemplateId: null,
    budgetId: null,
    walletId: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('recurringStatus', () => {
  it('uses the start date as the next due date when nothing has been materialized yet', () => {
    const template = makeExpense({
      id: 'template-1',
      isRecurring: true,
      recurringFrequency: 'monthly',
      date: '2026-08-10',
    });

    const status = recurringStatus(template, [template]);

    expect(status.lastMaterializedDate).toBeNull();
    expect(status.nextDueDate).toBe('2026-08-10');
  });

  it('computes next due from the most recent materialized instance', () => {
    const template = makeExpense({
      id: 'template-1',
      isRecurring: true,
      recurringFrequency: 'weekly',
      date: '2026-08-01',
    });
    const instances = [
      makeExpense({ id: 'i1', recurringTemplateId: 'template-1', date: '2026-08-01' }),
      makeExpense({ id: 'i2', recurringTemplateId: 'template-1', date: '2026-08-08' }),
    ];

    const status = recurringStatus(template, [template, ...instances]);

    expect(status.lastMaterializedDate).toBe('2026-08-08');
    expect(status.nextDueDate).toBe('2026-08-15');
  });

  it('ignores instances belonging to other templates', () => {
    const template = makeExpense({
      id: 'template-1',
      isRecurring: true,
      recurringFrequency: 'daily',
      date: '2026-08-01',
    });
    const otherInstance = makeExpense({
      id: 'i1',
      recurringTemplateId: 'template-2',
      date: '2026-08-05',
    });

    const status = recurringStatus(template, [template, otherInstance]);

    expect(status.lastMaterializedDate).toBeNull();
    expect(status.nextDueDate).toBe('2026-08-01');
  });
});
