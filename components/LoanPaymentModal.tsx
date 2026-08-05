import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { Alert, Modal, Pressable, StyleSheet, TextInput } from 'react-native';

import { ChipPicker } from '@/components/ChipPicker';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { WALLET_TYPE_OPTIONS } from '@/constants/wallets';
import { useWalletStore } from '@/store/useWalletStore';
import type { Loan } from '@/types';
import { formatCurrency } from '@/utils/currency';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const NO_WALLET = '__none__';

interface LoanPaymentModalProps {
  /** Null hides the modal. */
  loan: Loan | null;
  currency: string;
  onClose: () => void;
  onConfirm: (amount: number, walletId: string | null) => Promise<void>;
}

/** "Make Payment" confirm sheet: amount (defaults to the loan's monthly payment) + wallet. */
export function LoanPaymentModal({ loan, currency, onClose, onConfirm }: LoanPaymentModalProps) {
  const wallets = useWalletStore((state) => state.wallets);
  const colorScheme = useColorScheme();
  const [amountText, setAmountText] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState<string>(NO_WALLET);
  const [saving, setSaving] = useState(false);

  // Reset the form fields exactly when the sheet transitions from closed to
  // open (rather than in a useEffect) — an in-render state adjustment, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const isOpen = loan !== null;
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen && loan) {
      setAmountText(String(loan.monthlyPayment));
      setSelectedWalletId(NO_WALLET);
    }
  }

  async function handleConfirm() {
    if (!loan) {
      return;
    }
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      await onConfirm(amount, selectedWalletId === NO_WALLET ? null : selectedWalletId);
    } catch (err) {
      Alert.alert('Payment failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={loan !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: Colors[colorScheme].background }]}
          onPress={(e) => e.stopPropagation()}
        >
          {loan && (
            <>
              <Text style={styles.title}>Make Payment</Text>
              <Text style={styles.subtitle}>{loan.lenderName}</Text>
              <Text style={styles.remainingText}>
                Remaining balance: {formatCurrency(loan.remainingBalance, currency)}
              </Text>

              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
                ]}
                value={amountText}
                onChangeText={setAmountText}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Pay from</Text>
              <ChipPicker
                options={[
                  { value: NO_WALLET, label: 'None' },
                  ...wallets.map((wallet) => ({
                    value: wallet.id,
                    label: wallet.name,
                    icon: WALLET_TYPE_OPTIONS.find((o) => o.value === wallet.type)?.icon as
                      IoniconName | undefined,
                  })),
                ]}
                selectedValue={selectedWalletId}
                onSelect={setSelectedWalletId}
              />

              <View style={styles.actions}>
                <Pressable onPress={onClose} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  disabled={saving}
                  style={[
                    styles.confirmButton,
                    { backgroundColor: Colors[colorScheme].primary },
                    saving && styles.disabled,
                  ]}
                >
                  <Text style={styles.confirmButtonText}>
                    {saving ? 'Saving…' : 'Confirm Payment'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    width: '88%',
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  remainingText: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    opacity: 0.7,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    opacity: 0.7,
  },
  confirmButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});
