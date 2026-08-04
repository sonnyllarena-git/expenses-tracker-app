/**
 * Centralized brand design tokens. `constants/Colors.ts` maps these into its
 * existing light/dark `Colors[colorScheme].KEY` shape (which every screen
 * already consumes), so this file is the single place the palette is defined
 * — change a value here and it propagates everywhere without touching each
 * screen individually.
 *
 * Light-mode values are the brand spec as given. Dark-mode values extend the
 * same Tailwind-style scale the brand tokens already sit on (e.g. #111827 is
 * gray-900, #6B7280 is gray-500) one step further in each direction, with the
 * lighter "secondary" green promoted to the dark-mode primary/accent since a
 * brighter green reads better against a dark background than the light-mode
 * primary does.
 */
export const theme = {
  light: {
    primary: '#2D7F4A',
    secondary: '#10B981',
    text: '#111827',
    textSecondary: '#6B7280',
    muted: '#9CA3AF',
    background: '#FFFFFF',
    surface: '#F3F4F6',
    border: '#E5E7EB',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
  },
  dark: {
    primary: '#10B981',
    secondary: '#34D399',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    muted: '#6B7280',
    background: '#111827',
    surface: '#1F2937',
    border: '#374151',
    error: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
  },
  /**
   * Fixed 7-color set for the default categories, so each one renders the
   * same color in every chart/list regardless of theme. Applied to
   * constants/categories.ts's DEFAULT_CATEGORIES.
   */
  categoryPalette: [
    '#2D7F4A', // Food
    '#3B82F6', // Transport
    '#8B5CF6', // Entertainment
    '#F59E0B', // Utilities
    '#EF4444', // Health
    '#10B981', // Shopping
    '#6B7280', // Other
  ],
  /** Fallback swatch for a deleted/unknown category (was a bare '#999'). */
  categoryFallback: '#9CA3AF',
} as const;

export type ThemeMode = 'light' | 'dark';
