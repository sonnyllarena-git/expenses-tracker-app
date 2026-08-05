import { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { Loan } from '@/types';
import { isValidDateString, today } from '@/utils/date';

export interface LoanFormValues {
  lenderName: string;
  principalAmount: number;
  /** Decimal annual rate, e.g. 0.05 for 5%. Null = interest-free. */
  interestRate: number | null;
  monthlyPayment: number;
  startDate: string;
  notes: string;
}

interface LoanFormProps {
  /** When provided, the form edits this loan (principal/start date become read-only). */
  initialLoan?: Loan;
  submitLabel: string;
  onSubmit: (values: LoanFormValues) => Promise<void>;
}

/** Create/Edit loan form, used inline in the Loans section of Recurring & Loans. */
export function LoanForm({ initialLoan, submitLabel, onSubmit }: LoanFormProps) {
  const colorScheme = useColorScheme();

  const [lenderName, setLenderName] = useState(initialLoan?.lenderName ?? '');
  const [principalText, setPrincipalText] = useState(
    initialLoan ? String(initialLoan.principalAmount) : ''
  );
  const [ratePercentText, setRatePercentText] = useState(
    initialLoan?.interestRate ? String(initialLoan.interestRate * 100) : ''
  );
  const [monthlyPaymentText, setMonthlyPaymentText] = useState(
    initialLoan ? String(initialLoan.monthlyPayment) : ''
  );
  const [startDate, setStartDate] = useState(initialLoan?.startDate ?? today());
  const [notes, setNotes] = useState(initialLoan?.notes ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const principalAmount = Number(principalText);
    const monthlyPayment = Number(monthlyPaymentText);
    const ratePercent = ratePercentText.trim() === '' ? null : Number(ratePercentText);

    if (!lenderName.trim()) {
      Alert.alert('Missing lender', 'Enter who this loan is from.');
      return;
    }
    if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
      Alert.alert('Invalid principal', 'Enter a principal amount greater than zero.');
      return;
    }
    if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
      Alert.alert('Invalid monthly payment', 'Enter a monthly payment greater than zero.');
      return;
    }
    if (ratePercent !== null && (!Number.isFinite(ratePercent) || ratePercent < 0)) {
      Alert.alert('Invalid interest rate', 'Enter a rate of 0 or more, or leave it blank.');
      return;
    }
    if (!initialLoan && !isValidDateString(startDate)) {
      Alert.alert('Invalid date', 'Enter the start date as YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        lenderName: lenderName.trim(),
        principalAmount,
        interestRate: ratePercent === null || ratePercent === 0 ? null : ratePercent / 100,
        monthlyPayment,
        startDate,
        notes: notes.trim(),
      });
      if (!initialLoan) {
        setLenderName('');
        setPrincipalText('');
        setRatePercentText('');
        setMonthlyPaymentText('');
        setStartDate(today());
        setNotes('');
      }
    } catch (err) {
      Alert.alert('Failed to save loan', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Lender</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={lenderName}
        onChangeText={setLenderName}
        placeholder="e.g. BPI, Jane Dela Cruz"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
      />

      <Text style={styles.label}>Principal Amount</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={principalText}
        onChangeText={setPrincipalText}
        placeholder="0.00"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Interest Rate (% per year, optional)</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={ratePercentText}
        onChangeText={setRatePercentText}
        placeholder="Leave blank if interest-free"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Monthly Payment</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={monthlyPaymentText}
        onChangeText={setMonthlyPaymentText}
        placeholder="0.00"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
        keyboardType="decimal-pad"
      />

      {!initialLoan && (
        <>
          <Text style={styles.label}>Start Date</Text>
          <TextInput
            style={[
              styles.input,
              { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
            ]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors[colorScheme].tabIconDefault}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </>
      )}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[
          styles.input,
          { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
        ]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
        placeholderTextColor={Colors[colorScheme].tabIconDefault}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={[
          styles.submitButton,
          { backgroundColor: Colors[colorScheme].primary },
          saving && styles.disabled,
        ]}
      >
        <Text style={styles.submitButtonText}>{saving ? 'Saving…' : submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
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
  submitButton: {
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});
