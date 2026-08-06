import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { Text } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface ToastProps {
  message: string | null;
  /** Called once the fade-out animation finishes, so the caller can clear `message`. */
  onHide: () => void;
}

/** Self-contained fire-and-forget toast — no external dependency, auto-fades after ~2.2s. */
export function Toast({ message, onHide }: ToastProps) {
  const colorScheme = useColorScheme();
  // Lazily created once and never replaced — a plain mutable value driven by
  // Animated internally, not a rendered value, so useState just holds a
  // stable reference without ever calling its setter again.
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!message) {
      return;
    }
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    const hideTimer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(onHide);
    }, 2200);

    return () => clearTimeout(hideTimer);
  }, [message, onHide, opacity]);

  if (!message) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: Colors[colorScheme].text, opacity }]}
      pointerEvents="none"
    >
      <Text style={[styles.text, { color: Colors[colorScheme].background }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
