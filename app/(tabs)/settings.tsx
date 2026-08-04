import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ChipPicker } from '@/components/ChipPicker';
import { SettingsToggleRow } from '@/components/SettingsToggleRow';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { SUPPORTED_CURRENCIES } from '@/constants/currencies';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { AccountType } from '@/types';

const ACCOUNT_TYPES: AccountType[] = ['personal', 'family', 'business'];

export default function SettingsScreen() {
  const account = useSettingsStore((state) => state.account);
  const updateAccount = useSettingsStore((state) => state.updateAccount);
  const resetAllData = useSettingsStore((state) => state.resetAllData);
  const colorScheme = useColorScheme();
  const [resetting, setResetting] = useState(false);

  function handleUpdateError(err: unknown) {
    Alert.alert('Failed to save', err instanceof Error ? err.message : 'Unknown error');
  }

  function adjustPayday(delta: number) {
    if (!account) {
      return;
    }
    const next = Math.min(31, Math.max(1, account.payday + delta));
    if (next !== account.payday) {
      updateAccount({ payday: next }).catch(handleUpdateError);
    }
  }

  function handleDeleteAll() {
    Alert.alert(
      'Delete all data?',
      'This permanently deletes all expenses and budgets on this device. Categories will be reset to defaults. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetAllData();
              Alert.alert('All data deleted.');
            } catch (err) {
              Alert.alert(
                'Failed to delete data',
                err instanceof Error ? err.message : 'Unknown error'
              );
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionLabel}>Currency</Text>
        <ChipPicker
          options={SUPPORTED_CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
          selectedValue={account?.currency ?? null}
          onSelect={(code) => updateAccount({ currency: code }).catch(handleUpdateError)}
        />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Account Type</Text>
        <ChipPicker
          options={ACCOUNT_TYPES.map((type) => ({
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
          }))}
          selectedValue={account?.accountType ?? null}
          onSelect={(type) => updateAccount({ accountType: type }).catch(handleUpdateError)}
        />
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionLabel}>Payday</Text>
        <Text style={styles.paydayCaption}>Day of the month your income typically lands.</Text>
        <View style={styles.paydayRow}>
          <Pressable onPress={() => adjustPayday(-1)} hitSlop={8} disabled={!account}>
            <Ionicons
              name="chevron-back-circle-outline"
              size={28}
              color={Colors[colorScheme].primary}
            />
          </Pressable>
          <Text style={styles.paydayValue}>Day {account?.payday ?? 25}</Text>
          <Pressable onPress={() => adjustPayday(1)} hitSlop={8} disabled={!account}>
            <Ionicons
              name="chevron-forward-circle-outline"
              size={28}
              color={Colors[colorScheme].primary}
            />
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <SettingsToggleRow
          label="Family Sharing"
          caption="Family member management is coming in a future update."
          value={account?.sharingEnabled ?? false}
          onValueChange={(v) => updateAccount({ sharingEnabled: v }).catch(handleUpdateError)}
        />
        <SettingsToggleRow
          label="Notifications"
          caption="Enables alerts once notification scheduling ships; no permissions are requested yet."
          value={account?.notificationsEnabled ?? true}
          onValueChange={(v) => updateAccount({ notificationsEnabled: v }).catch(handleUpdateError)}
        />
        <SettingsToggleRow
          label="Budget Alerts"
          caption="Alerts you when a category nears or exceeds its monthly budget."
          value={account?.budgetAlertsEnabled ?? true}
          onValueChange={(v) => updateAccount({ budgetAlertsEnabled: v }).catch(handleUpdateError)}
        />
      </View>

      <View style={[styles.card, { backgroundColor: Colors[colorScheme].card }]}>
        <Text style={styles.sectionLabel}>Data</Text>
        <Pressable
          onPress={handleDeleteAll}
          disabled={resetting}
          style={[
            styles.dangerButton,
            { borderColor: Colors[colorScheme].error },
            resetting && styles.disabled,
          ]}
        >
          <Text style={[styles.dangerButtonText, { color: Colors[colorScheme].error }]}>
            {resetting ? 'Deleting…' : 'Delete All Data'}
          </Text>
        </Pressable>
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
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  sectionLabelSpaced: {
    marginTop: 12,
  },
  paydayCaption: {
    fontSize: 12,
    opacity: 0.6,
  },
  paydayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 4,
  },
  paydayValue: {
    fontSize: 17,
    fontWeight: '700',
    minWidth: 80,
    textAlign: 'center',
  },
  dangerButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});
