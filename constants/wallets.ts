import type { WalletType } from '@/types';

// Ionicons glyph names (see @expo/vector-icons) — one distinct icon per wallet type.
export const WALLET_TYPE_OPTIONS: { value: WalletType; label: string; icon: string }[] = [
  { value: 'gcash', label: 'GCash', icon: 'phone-portrait-outline' },
  { value: 'credit_card', label: 'Credit Card', icon: 'card-outline' },
  { value: 'debit_card', label: 'Debit Card', icon: 'card' },
  { value: 'cash', label: 'Cash', icon: 'cash-outline' },
  { value: 'online_money', label: 'Online Money', icon: 'globe-outline' },
  { value: 'bitcoin', label: 'Bitcoin', icon: 'logo-bitcoin' },
  { value: 'other', label: 'Other', icon: 'wallet-outline' },
];
