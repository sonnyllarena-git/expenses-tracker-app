import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { LoanForm, type LoanFormValues } from '@/components/LoanForm';
import { LoanPaymentModal } from '@/components/LoanPaymentModal';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useLoanStore } from '@/store/useLoanStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Loan } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { formatDate, today } from '@/utils/date';
import { loanProgress } from '@/utils/loan';

/** Loan management — the "Loans" half of the Recurring & Loans sub-tab. */
export function LoansSection() {
  const account = useSettingsStore((state) => state.account);
  const categories = useCategoryStore((state) => state.categories);
  const loans = useLoanStore((state) => state.loans);
  const loadLoans = useLoanStore((state) => state.load);
  const addLoan = useLoanStore((state) => state.addLoan);
  const editLoan = useLoanStore((state) => state.editLoan);
  const removeLoan = useLoanStore((state) => state.removeLoan);
  const makePayment = useLoanStore((state) => state.makePayment);
  const colorScheme = useColorScheme();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [payingLoan, setPayingLoan] = useState<Loan | null>(null);

  useEffect(() => {
    if (account) {
      loadLoans(account.id);
    }
  }, [account, loadLoans]);

  const currency = account?.currency ?? 'PHP';
  const activeLoans = loans.filter((loan) => loan.isActive);
  const paidOffLoans = loans.filter((loan) => !loan.isActive);
  const editingLoan = loans.find((loan) => loan.id === editingId);

  async function handleCreate(values: LoanFormValues) {
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }
    await addLoan({ userId: account.id, ...values });
  }

  async function handleEdit(values: LoanFormValues) {
    if (!editingId) {
      return;
    }
    await editLoan(editingId, {
      lenderName: values.lenderName,
      interestRate: values.interestRate,
      monthlyPayment: values.monthlyPayment,
      notes: values.notes,
    });
    setEditingId(null);
  }

  function confirmDelete(loan: Loan) {
    Alert.alert('Delete loan?', `"${loan.lenderName}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          removeLoan(loan.id).catch((err) => {
            Alert.alert('Failed to delete', err instanceof Error ? err.message : 'Unknown error');
          });
          if (editingId === loan.id) {
            setEditingId(null);
          }
        },
      },
    ]);
  }

  async function handleConfirmPayment(amount: number, walletId: string | null) {
    if (!payingLoan) {
      return;
    }
    const loanPaymentCategory = categories.find((c) => c.name === 'Loan Payment');
    if (!loanPaymentCategory) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }
    await makePayment({
      loanId: payingLoan.id,
      amount,
      date: today(),
      categoryId: loanPaymentCategory.id,
      walletId,
    });
    setPayingLoan(null);
  }

  function renderLoanRow(loan: Loan, paidOff: boolean) {
    const progress = loanProgress(loan.principalAmount, loan.remainingBalance);
    return (
      <View key={loan.id} style={styles.loanRow}>
        <View style={styles.loanHeader}>
          <View style={styles.loanMain}>
            <Text style={styles.loanTitle}>{loan.lenderName}</Text>
            <Text style={styles.loanCaption}>
              {formatCurrency(loan.remainingBalance, currency)} remaining
              {loan.interestRate ? ` · ${(loan.interestRate * 100).toFixed(1)}% interest` : ''}
            </Text>
          </View>
          {!paidOff && (
            <Pressable onPress={() => setEditingId(loan.id)} hitSlop={8}>
              <Ionicons name="create-outline" size={20} color={Colors[colorScheme].text} />
            </Pressable>
          )}
          <Pressable onPress={() => confirmDelete(loan)} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color={Colors[colorScheme].error} />
          </Pressable>
        </View>

        <View style={[styles.barTrack, { backgroundColor: Colors[colorScheme].border }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: paidOff
                  ? Colors[colorScheme].success
                  : Colors[colorScheme].primary,
              },
            ]}
          />
        </View>

        {paidOff ? (
          <Text style={styles.loanCaption}>Paid in full</Text>
        ) : (
          <>
            <Text style={styles.loanCaption}>
              Next payment: {formatDate(loan.nextPaymentDate)} ·{' '}
              {formatCurrency(loan.monthlyPayment, currency)}/mo
            </Text>
            <Pressable
              onPress={() => setPayingLoan(loan)}
              style={[styles.payButton, { backgroundColor: Colors[colorScheme].primary }]}
            >
              <Text style={styles.payButtonText}>Make Payment</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Loans</Text>
        {activeLoans.length === 0 && (
          <Text style={styles.emptyText}>No active loans. Add one below.</Text>
        )}
        {activeLoans.map((loan) => renderLoanRow(loan, false))}
      </View>

      {paidOffLoans.length > 0 && (
        <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
          <Text style={styles.sectionTitle}>Paid Off</Text>
          {paidOffLoans.map((loan) => renderLoanRow(loan, true))}
        </View>
      )}

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>{editingLoan ? 'Edit Loan' : 'Add Loan'}</Text>
        <LoanForm
          key={editingLoan?.id ?? 'new'}
          initialLoan={editingLoan}
          submitLabel={editingLoan ? 'Save Changes' : 'Add Loan'}
          onSubmit={editingLoan ? handleEdit : handleCreate}
        />
        {editingLoan && (
          <Pressable onPress={() => setEditingId(null)} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      <LoanPaymentModal
        loan={payingLoan}
        currency={currency}
        onClose={() => setPayingLoan(null)}
        onConfirm={handleConfirmPayment}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    opacity: 0.7,
  },
  loanRow: {
    gap: 6,
    paddingVertical: 8,
  },
  loanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loanMain: {
    flex: 1,
  },
  loanTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  loanCaption: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  payButton: {
    marginTop: 4,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    opacity: 0.7,
  },
});
