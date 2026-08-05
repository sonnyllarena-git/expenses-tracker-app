import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ChipPicker } from '@/components/ChipPicker';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { WALLET_TYPE_OPTIONS } from '@/constants/wallets';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWalletStore } from '@/store/useWalletStore';
import type { Wallet, WalletType } from '@/types';
import { formatCurrency } from '@/utils/currency';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface WalletFormState {
  editingId: string | null;
  name: string;
  type: WalletType | null;
  balanceText: string;
}

const initialForm: WalletFormState = { editingId: null, name: '', type: null, balanceText: '' };

export default function WalletScreen() {
  const account = useSettingsStore((state) => state.account);
  const wallets = useWalletStore((state) => state.wallets);
  const loadWallets = useWalletStore((state) => state.load);
  const addWallet = useWalletStore((state) => state.addWallet);
  const editWallet = useWalletStore((state) => state.editWallet);
  const archiveWallet = useWalletStore((state) => state.archiveWallet);
  const netWorth = useWalletStore((state) => state.netWorth());
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [form, setForm] = useState<WalletFormState>(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (account) {
      loadWallets(account.id);
    }
  }, [account, loadWallets]);

  const currency = account?.currency ?? 'PHP';

  function resetForm() {
    setForm(initialForm);
  }

  function startEdit(wallet: Wallet) {
    setForm({
      editingId: wallet.id,
      name: wallet.name,
      type: wallet.type,
      balanceText: String(wallet.balance),
    });
  }

  function confirmArchive(wallet: Wallet) {
    Alert.alert(
      'Archive wallet?',
      `"${wallet.name}" will be hidden from your wallet list and net worth. Its transaction history is kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archiveWallet(wallet.id).catch((err) => {
              Alert.alert(
                'Failed to archive',
                err instanceof Error ? err.message : 'Unknown error'
              );
            });
            if (form.editingId === wallet.id) {
              resetForm();
            }
          },
        },
      ]
    );
  }

  async function submitForm() {
    const balance = Number(form.balanceText);
    if (!Number.isFinite(balance)) {
      Alert.alert('Invalid balance', 'Enter a valid balance.');
      return;
    }
    if (!form.name.trim()) {
      Alert.alert('Missing name', 'Give this wallet a name.');
      return;
    }
    if (!form.editingId && !form.type) {
      Alert.alert('Missing type', 'Select a wallet type.');
      return;
    }
    if (!account) {
      Alert.alert('Not ready', 'The app is still starting up — try again in a moment.');
      return;
    }

    setSaving(true);
    try {
      if (form.editingId) {
        await editWallet(form.editingId, { name: form.name.trim(), balance });
      } else {
        await addWallet({
          userId: account.id,
          name: form.name.trim(),
          type: form.type as WalletType,
          balance,
          currency,
        });
      }
      resetForm();
    } catch (err) {
      Alert.alert('Failed to save wallet', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Wallet</Text>

      <View style={[styles.netWorthCard, { backgroundColor: Colors[colorScheme].primary }]}>
        <Text style={styles.netWorthLabel}>Net Worth</Text>
        <Text style={styles.netWorthValue}>{formatCurrency(netWorth, currency)}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionTitle}>Wallets</Text>
        {wallets.length === 0 && (
          <Text style={styles.emptyText}>No wallets yet. Add one below.</Text>
        )}
        {wallets.map((wallet) => {
          const typeOption = WALLET_TYPE_OPTIONS.find((o) => o.value === wallet.type);
          return (
            <Pressable
              key={wallet.id}
              onPress={() =>
                router.push({ pathname: '/wallet-transactions/[id]', params: { id: wallet.id } })
              }
              style={({ pressed }) => [styles.walletRow, pressed && styles.walletRowPressed]}
            >
              <View style={[styles.iconCircle, { backgroundColor: Colors[colorScheme].primary }]}>
                <Ionicons
                  name={(typeOption?.icon as IoniconName) ?? 'wallet-outline'}
                  size={18}
                  color="#fff"
                />
              </View>
              <View style={styles.walletMain}>
                <Text style={styles.walletName}>{wallet.name}</Text>
                <Text style={styles.walletType}>{typeOption?.label ?? wallet.type}</Text>
              </View>
              <Text
                style={[
                  styles.walletBalance,
                  wallet.balance < 0 && { color: Colors[colorScheme].error },
                ]}
              >
                {formatCurrency(wallet.balance, wallet.currency)}
              </Text>
              <Pressable onPress={() => startEdit(wallet)} hitSlop={8} style={styles.walletIcon}>
                <Ionicons name="create-outline" size={18} color={Colors[colorScheme].text} />
              </Pressable>
              <Pressable
                onPress={() => confirmArchive(wallet)}
                hitSlop={8}
                style={styles.walletIcon}
              >
                <Ionicons name="archive-outline" size={18} color={Colors[colorScheme].error} />
              </Pressable>
            </Pressable>
          );
        })}

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
          {form.editingId ? 'Edit Wallet' : 'Add Wallet'}
        </Text>

        <TextInput
          style={[
            styles.input,
            { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
          ]}
          value={form.name}
          onChangeText={(text) => setForm((f) => ({ ...f, name: text }))}
          placeholder="Wallet name"
          placeholderTextColor={Colors[colorScheme].tabIconDefault}
        />

        {!form.editingId && (
          <ChipPicker
            options={WALLET_TYPE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
              icon: o.icon as IoniconName,
            }))}
            selectedValue={form.type}
            onSelect={(type) => setForm((f) => ({ ...f, type }))}
          />
        )}

        <TextInput
          style={[
            styles.input,
            { color: Colors[colorScheme].text, borderColor: Colors[colorScheme].border },
          ]}
          value={form.balanceText}
          onChangeText={(text) => setForm((f) => ({ ...f, balanceText: text }))}
          placeholder={form.editingId ? 'Balance' : 'Starting balance'}
          placeholderTextColor={Colors[colorScheme].tabIconDefault}
          keyboardType="decimal-pad"
        />

        <View style={styles.formActions}>
          <Pressable
            onPress={submitForm}
            disabled={saving}
            style={[
              styles.submitButton,
              { backgroundColor: Colors[colorScheme].primary },
              saving && styles.disabled,
            ]}
          >
            <Text style={styles.submitButtonText}>
              {saving ? 'Saving…' : form.editingId ? 'Save Changes' : 'Add Wallet'}
            </Text>
          </Pressable>
          {form.editingId && (
            <Pressable onPress={resetForm} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  netWorthCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 4,
  },
  netWorthLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.85,
  },
  netWorthValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
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
  sectionLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  sectionLabelSpaced: {
    marginTop: 12,
  },
  emptyText: {
    opacity: 0.7,
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  walletRowPressed: {
    opacity: 0.6,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletMain: {
    flex: 1,
  },
  walletName: {
    fontSize: 15,
    fontWeight: '600',
  },
  walletType: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  walletBalance: {
    fontSize: 15,
    fontWeight: '700',
  },
  walletIcon: {
    padding: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  formActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    flex: 1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.6,
  },
});
