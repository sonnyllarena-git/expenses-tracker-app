const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

// Accent = positive/savings/under-budget, warning = over-budget/alerts.
const accent = '#2E7D32';
const warning = '#C62828';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    accent,
    warning,
    card: '#f5f5f5',
    border: '#e0e0e0',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    accent,
    warning,
    card: '#1c1c1e',
    border: '#2c2c2e',
  },
};
