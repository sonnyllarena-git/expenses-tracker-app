// Fixed, chip-selectable list of currencies for the Settings screen.
// `formatCurrency` (utils/currency.ts) accepts any ISO 4217 code via
// Intl.NumberFormat, so this is a UI convenience list, not a validation set.
export const SUPPORTED_CURRENCIES = [
  { code: 'PHP', label: 'Philippine Peso' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
] as const;
