import { walletBalanceAdjustments } from '../wallet';

describe('walletBalanceAdjustments', () => {
  it('debits the wallet on a brand-new expense (insert)', () => {
    expect(walletBalanceAdjustments(null, { walletId: 'gcash', amount: 500 })).toEqual([
      { walletId: 'gcash', delta: -500 },
    ]);
  });

  it('does nothing for an expense with no wallet (insert with no wallet)', () => {
    expect(walletBalanceAdjustments(null, null)).toEqual([]);
  });

  it('reverses then re-debits the same wallet when only the amount changes', () => {
    // GCash 10,000 -500 = 9,500. Edit 500 -> 700 should net to 9,300, not 8,800.
    const adjustments = walletBalanceAdjustments(
      { walletId: 'gcash', amount: 500 },
      { walletId: 'gcash', amount: 700 }
    );
    expect(adjustments).toEqual([
      { walletId: 'gcash', delta: 500 },
      { walletId: 'gcash', delta: -700 },
    ]);
    const net = adjustments
      .filter((a) => a.walletId === 'gcash')
      .reduce((sum, a) => sum + a.delta, 0);
    expect(net).toBe(-200);
  });

  it('credits back the old wallet and debits the new one when the wallet changes', () => {
    expect(
      walletBalanceAdjustments(
        { walletId: 'gcash', amount: 700 },
        { walletId: 'cash', amount: 700 }
      )
    ).toEqual([
      { walletId: 'gcash', delta: 700 },
      { walletId: 'cash', delta: -700 },
    ]);
  });

  it('credits back the old wallet and applies nothing new when the wallet is removed', () => {
    expect(walletBalanceAdjustments({ walletId: 'cash', amount: 700 }, null)).toEqual([
      { walletId: 'cash', delta: 700 },
    ]);
  });

  it('debits a newly-added wallet when one is set on an expense that had none', () => {
    expect(walletBalanceAdjustments(null, { walletId: 'gcash', amount: 300 })).toEqual([
      { walletId: 'gcash', delta: -300 },
    ]);
  });

  it('reverses the linked transaction on delete (next: null)', () => {
    expect(walletBalanceAdjustments({ walletId: 'gcash', amount: 9300 }, null)).toEqual([
      { walletId: 'gcash', delta: 9300 },
    ]);
  });
});
