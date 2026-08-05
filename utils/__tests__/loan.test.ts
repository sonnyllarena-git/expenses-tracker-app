import {
  loanBalanceAfterPayment,
  loanProgress,
  nextLoanPaymentDate,
  simpleInterestAmount,
} from '../loan';

describe('simpleInterestAmount', () => {
  it('is zero when the rate is null (interest-free)', () => {
    expect(simpleInterestAmount(10000, null, 1)).toBe(0);
  });

  it('is zero when the rate is exactly zero', () => {
    expect(simpleInterestAmount(10000, 0, 1)).toBe(0);
  });

  it('computes principal * rate * time', () => {
    expect(simpleInterestAmount(10000, 0.05, 1)).toBe(500);
    expect(simpleInterestAmount(10000, 0.05, 2)).toBe(1000);
  });

  it('handles a fractional time period', () => {
    expect(simpleInterestAmount(12000, 0.06, 0.5)).toBe(360);
  });
});

describe('loanBalanceAfterPayment', () => {
  it('subtracts the payment from the remaining balance', () => {
    expect(loanBalanceAfterPayment(10000, 1000)).toBe(9000);
  });

  it('reaches exactly zero when the payment matches the remaining balance', () => {
    expect(loanBalanceAfterPayment(1000, 1000)).toBe(0);
  });

  it('clamps at zero rather than going negative on an overpayment', () => {
    expect(loanBalanceAfterPayment(500, 700)).toBe(0);
  });
});

describe('loanProgress', () => {
  it('is 0 before any payment has been made', () => {
    expect(loanProgress(10000, 10000)).toBe(0);
  });

  it('is 0.1 after 10% of the principal has been paid off', () => {
    expect(loanProgress(10000, 9000)).toBeCloseTo(0.1);
  });

  it('is 1 once the loan is fully paid off', () => {
    expect(loanProgress(10000, 0)).toBe(1);
  });

  it('clamps to 1 rather than exceeding it if the balance somehow overshoots', () => {
    expect(loanProgress(10000, -500)).toBe(1);
  });

  it('treats a non-positive principal as fully paid, avoiding a divide-by-zero', () => {
    expect(loanProgress(0, 0)).toBe(1);
  });
});

describe('nextLoanPaymentDate', () => {
  it('advances one calendar month from the given due date', () => {
    expect(nextLoanPaymentDate('2026-01-15')).toBe('2026-02-15');
  });

  it('rolls over the year boundary', () => {
    expect(nextLoanPaymentDate('2026-12-01')).toBe('2027-01-01');
  });
});
