import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { SubcategoryPicker } from '@/components/SubcategoryPicker';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useSubcategoryStore } from '@/store/useSubcategoryStore';
import type { Category, SuggestedActionStatus, WalletType } from '@/types';
import { validateSuggestedAction, type ParsedSuggestedAction } from '@/utils/suggestedAction';
import { formatCurrency } from '@/utils/currency';

export type ResolvedSuggestedAction =
  | {
      kind: 'expense';
      amount: number;
      categoryId: string;
      subcategoryId: string | null;
      description: string;
    }
  | { kind: 'budget'; amount: number; categoryId: string; alertThreshold: number }
  | { kind: 'wallet'; amount: number; walletType: WalletType; walletName: string };

interface SuggestedActionCardProps {
  action: ParsedSuggestedAction;
  status: SuggestedActionStatus;
  categories: Category[];
  currency: string;
  onConfirm: (resolved: ResolvedSuggestedAction) => void;
  onCancel: () => void;
}

/**
 * Renders below an assistant [SUGGEST_ACTION] message. Validates against the
 * user's real categories on every render (not just once at confirm time) so
 * a category that doesn't exist never shows a Confirm button in the first
 * place — nothing gets saved from an invalid suggestion.
 */
export function SuggestedActionCard({
  action,
  status,
  categories,
  currency,
  onConfirm,
  onCancel,
}: SuggestedActionCardProps) {
  const colorScheme = useColorScheme();
  const subcategories = useSubcategoryStore((state) => state.subcategories);
  const validated = validateSuggestedAction(action, categories, subcategories);
  // Lets the user override a wrong AI-guessed subcategory before confirming
  // (see SubcategoryPicker below) — initialized once from the AI's guess.
  const [overrideSubcategoryId, setOverrideSubcategoryId] = useState<string | null>(() =>
    validated.valid && validated.kind === 'expense' ? validated.subcategoryId : null
  );

  if (!validated.valid) {
    return (
      <View style={[styles.card, { borderColor: Colors[colorScheme].error }]}>
        <Text style={[styles.errorText, { color: Colors[colorScheme].error }]}>
          {`⚠️ Couldn't apply this suggestion: ${validated.error}`}
        </Text>
      </View>
    );
  }

  const isBudget = validated.kind === 'budget';
  const isWallet = validated.kind === 'wallet';

  if (status === 'confirmed') {
    return (
      <View style={[styles.card, { borderColor: Colors[colorScheme].success }]}>
        <Text style={[styles.confirmedText, { color: Colors[colorScheme].success }]}>
          {isWallet
            ? `✓ Added ${formatCurrency(validated.amount, currency)} to ${validated.walletName} wallet`
            : isBudget
              ? `✓ Set ${formatCurrency(validated.amount, currency)}/month ${validated.categoryName} budget`
              : `✓ Added ${formatCurrency(validated.amount, currency)} ${validated.categoryName} expense`}
        </Text>
      </View>
    );
  }

  if (status === 'cancelled') {
    return (
      <View style={[styles.card, { borderColor: Colors[colorScheme].border }]}>
        <Text style={styles.dismissedText}>Suggestion dismissed.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: Colors[colorScheme].border }]}>
      <Text style={styles.prompt}>
        {isWallet
          ? `Add ${formatCurrency(validated.amount, currency)} to ${validated.walletName} wallet?`
          : isBudget
            ? 'Would you like to set this budget?'
            : 'Would you like to add this?'}
      </Text>
      {isWallet ? (
        <Text style={styles.amount}>
          {formatCurrency(validated.amount, currency)} → {validated.walletName}
        </Text>
      ) : isBudget ? (
        <>
          <Text style={styles.amount}>{formatCurrency(validated.amount, currency)}/month</Text>
          <Text style={styles.category}>Category: {validated.categoryName}</Text>
          <Text style={styles.category}>
            Alert at {Math.round(validated.alertThreshold * 100)}% spent
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.amount}>
            {formatCurrency(validated.amount, currency)} {validated.description}
          </Text>
          <Text style={styles.category}>Category: {validated.categoryName}</Text>
          <SubcategoryPicker
            categoryId={validated.categoryId}
            value={overrideSubcategoryId}
            onChange={setOverrideSubcategoryId}
          />
        </>
      )}
      <View style={styles.buttonRow}>
        <Pressable
          onPress={() =>
            onConfirm(
              isWallet
                ? {
                    kind: 'wallet',
                    amount: validated.amount,
                    walletType: validated.walletType,
                    walletName: validated.walletName,
                  }
                : isBudget
                  ? {
                      kind: 'budget',
                      amount: validated.amount,
                      categoryId: validated.categoryId,
                      alertThreshold: validated.alertThreshold,
                    }
                  : {
                      kind: 'expense',
                      amount: validated.amount,
                      categoryId: validated.categoryId,
                      subcategoryId: overrideSubcategoryId,
                      description: validated.description,
                    }
            )
          }
          style={[styles.button, { backgroundColor: Colors[colorScheme].primary }]}
        >
          <Text style={styles.buttonTextPrimary}>Confirm</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          style={[
            styles.button,
            styles.buttonSecondary,
            { borderColor: Colors[colorScheme].border },
          ]}
        >
          <Text style={styles.buttonTextSecondary}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  prompt: {
    fontSize: 13,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  category: {
    fontSize: 13,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  confirmedText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dismissedText: {
    fontSize: 13,
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  buttonTextPrimary: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
  },
});
