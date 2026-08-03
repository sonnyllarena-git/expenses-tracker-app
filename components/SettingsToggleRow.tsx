import { StyleSheet, Switch } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface SettingsToggleRowProps {
  label: string;
  caption?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SettingsToggleRow({
  label,
  caption,
  value,
  onValueChange,
}: SettingsToggleRowProps) {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.row}>
      <View style={styles.textColumn}>
        <Text style={styles.label}>{label}</Text>
        {!!caption && <Text style={styles.caption}>{caption}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors[colorScheme].border, true: Colors[colorScheme].accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
});
