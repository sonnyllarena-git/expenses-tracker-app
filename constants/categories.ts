import { theme } from '@/theme';

// Pre-defined categories seeded into the `categories` table on first launch.
// `icon` is an Ionicons glyph name (see @expo/vector-icons). Colors come from
// theme.categoryPalette so every chart/list renders each category the same
// color regardless of theme; see db/queries/categories.ts's seed-sync step
// for how already-seeded installs pick up palette changes.
export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'fast-food', color: theme.categoryPalette[0] },
  { name: 'Transport', icon: 'car', color: theme.categoryPalette[1] },
  { name: 'Entertainment', icon: 'film', color: theme.categoryPalette[2] },
  { name: 'Utilities', icon: 'flash', color: theme.categoryPalette[3] },
  { name: 'Health', icon: 'medkit', color: theme.categoryPalette[4] },
  { name: 'Shopping', icon: 'bag', color: theme.categoryPalette[5] },
  { name: 'Other', icon: 'ellipsis-horizontal', color: theme.categoryPalette[6] },
] as const;
