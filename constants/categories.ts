// Pre-defined categories seeded into the `categories` table on first launch.
// `icon` is an Ionicons glyph name (see @expo/vector-icons).
export const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'fast-food', color: '#F4511E' },
  { name: 'Transport', icon: 'car', color: '#1E88E5' },
  { name: 'Entertainment', icon: 'film', color: '#8E24AA' },
  { name: 'Utilities', icon: 'flash', color: '#FDD835' },
  { name: 'Health', icon: 'medkit', color: '#E53935' },
  { name: 'Shopping', icon: 'bag', color: '#00897B' },
  { name: 'Other', icon: 'ellipsis-horizontal', color: '#757575' },
] as const;
