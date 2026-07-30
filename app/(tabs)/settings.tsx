import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useSettingsStore } from '@/store/useSettingsStore';

export default function SettingsScreen() {
  const account = useSettingsStore((state) => state.account);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Account type, currency, sharing, notifications, and data export/delete — coming in Weeks
        5-11.
      </Text>
      {account && (
        <Text style={styles.subtitle}>
          Current account: {account.accountType} ({account.currency})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
