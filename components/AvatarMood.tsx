import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { theme } from '@/theme';
import type { BudgetMood } from '@/utils/budget';

const MOOD_EMOJI: Record<BudgetMood, string> = {
  happy: '😊',
  neutral: '😐',
  sad: '😟',
};

// Status colors are identical across light/dark (see theme.ts), so this
// mapping is theme-invariant and doesn't need useColorScheme().
const MOOD_COLOR: Record<BudgetMood, string> = {
  happy: theme.light.success,
  neutral: theme.light.warning,
  sad: theme.light.error,
};

interface AvatarMoodProps {
  mood: BudgetMood;
  size?: number;
}

/** Animated (Phase-1 placeholder) emoji avatar — swap for a brand avatar in Phase 2. */
export function AvatarMood({ mood, size = 72 }: AvatarMoodProps) {
  const [bounce] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const color = MOOD_COLOR[mood];

  return (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          backgroundColor: `${color}22`,
          transform: [{ translateY }],
        },
      ]}
    >
      <Animated.Text style={[styles.emoji, { fontSize: size * 0.5 }]}>
        {MOOD_EMOJI[mood]}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    textAlign: 'center',
  },
});
