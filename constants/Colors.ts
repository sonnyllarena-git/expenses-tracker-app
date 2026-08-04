import { theme } from '../theme';

// Sourced from theme.ts's brand tokens — change a value there, not here.
// `tint`/`tabIconDefault`/`tabIconSelected`/`card` are kept as the existing
// key names every screen already consumes; `primary`/`secondary`/`error`/
// `warning`/`success`/`textSecondary` are the newer, more precise names.
export default {
  light: {
    text: theme.light.text,
    textSecondary: theme.light.textSecondary,
    background: theme.light.background,
    tint: theme.light.primary,
    tabIconDefault: theme.light.muted,
    tabIconSelected: theme.light.primary,
    primary: theme.light.primary,
    secondary: theme.light.secondary,
    error: theme.light.error,
    warning: theme.light.warning,
    success: theme.light.success,
    card: theme.light.surface,
    border: theme.light.border,
  },
  dark: {
    text: theme.dark.text,
    textSecondary: theme.dark.textSecondary,
    background: theme.dark.background,
    tint: theme.dark.primary,
    tabIconDefault: theme.dark.muted,
    tabIconSelected: theme.dark.primary,
    primary: theme.dark.primary,
    secondary: theme.dark.secondary,
    error: theme.dark.error,
    warning: theme.dark.warning,
    success: theme.dark.success,
    card: theme.dark.surface,
    border: theme.dark.border,
  },
};
