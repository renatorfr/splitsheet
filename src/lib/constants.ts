import { AccountGroup, AppSettings, CategoryId, ExpenseFilters } from '../types';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  emoji: string;
  colorClass: string;
  badgeClass: string;
  barColor: string;
}

export const DEFAULT_ACCOUNTS: AccountGroup[] = [
  {
    id: 'everyday',
    name: 'Everyday',
    emoji: '🏠',
    createdAt: 1,
    updatedAt: 1
  }
];

export const ACCOUNT_EMOJIS = [
  '🏠',
  '✈️',
  '🏖️',
  '🛒',
  '🍽️',
  '🎉',
  '🚗',
  '🛋️',
  '🐶',
  '🐱',
  '🎄',
  '🏕️',
  '💍',
  '🎟️',
  '💼',
  '🏥',
  '🎁',
  '🍷',
  '☕',
  '🏋️',
  '🎮',
  '👶',
  '🎓',
  '🛠️',
  '💡',
  '🏦',
  '🌴',
  '⛷️'
];

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'Groceries',
    label: 'Groceries',
    emoji: '🛒',
    colorClass: 'text-[#a7f3d0]',
    badgeClass: 'bg-[#a7f3d0]/15 text-[#a7f3d0] border-[#a7f3d0]/30',
    barColor: '#a7f3d0'
  },
  {
    id: 'Dining Out',
    label: 'Dining Out',
    emoji: '🍽️',
    colorClass: 'text-[#fdba74]',
    badgeClass: 'bg-[#fdba74]/15 text-[#fed7aa] border-[#fdba74]/30',
    barColor: '#fdba74'
  },
  {
    id: 'Rent & Bills',
    label: 'Rent & Bills',
    emoji: '🏠',
    colorClass: 'text-[#bae6fd]',
    badgeClass: 'bg-[#bae6fd]/15 text-[#bae6fd] border-[#bae6fd]/30',
    barColor: '#bae6fd'
  },
  {
    id: 'Travel',
    label: 'Travel',
    emoji: '✈️',
    colorClass: 'text-[#ddd6fe]',
    badgeClass: 'bg-[#ddd6fe]/15 text-[#ddd6fe] border-[#ddd6fe]/30',
    barColor: '#c4b5fd'
  },
  {
    id: 'Transport',
    label: 'Transport',
    emoji: '🚗',
    colorClass: 'text-[#99f6e4]',
    badgeClass: 'bg-[#99f6e4]/15 text-[#99f6e4] border-[#99f6e4]/30',
    barColor: '#99f6e4'
  },
  {
    id: 'Shopping',
    label: 'Shopping',
    emoji: '🛍️',
    colorClass: 'text-[#fbcfe8]',
    badgeClass: 'bg-[#fbcfe8]/15 text-[#fbcfe8] border-[#fbcfe8]/30',
    barColor: '#f9a8d4'
  },
  {
    id: 'Home',
    label: 'Home',
    emoji: '🛋️',
    colorClass: 'text-[#fde68a]',
    badgeClass: 'bg-[#fde68a]/15 text-[#fde68a] border-[#fde68a]/30',
    barColor: '#fde68a'
  },
  {
    id: 'Entertainment',
    label: 'Entertainment',
    emoji: '🎬',
    colorClass: 'text-[#c7d2fe]',
    badgeClass: 'bg-[#c7d2fe]/15 text-[#c7d2fe] border-[#c7d2fe]/30',
    barColor: '#a5b4fc'
  },
  {
    id: 'Health',
    label: 'Health',
    emoji: '💊',
    colorClass: 'text-[#fecdd3]',
    badgeClass: 'bg-[#fecdd3]/15 text-[#fecdd3] border-[#fecdd3]/30',
    barColor: '#fda4af'
  },
  {
    id: 'Settlement',
    label: 'Settlement',
    emoji: '🤝',
    colorClass: 'text-[#bae6fd]',
    badgeClass: 'bg-[#bae6fd]/15 text-[#e0f2fe] border-[#bae6fd]/35',
    barColor: '#7dd3fc'
  },
  {
    id: 'Other',
    label: 'Other',
    emoji: '📦',
    colorClass: 'text-[#cbd5e1]',
    badgeClass: 'bg-[#cbd5e1]/15 text-[#e2e8f0] border-[#cbd5e1]/30',
    barColor: '#cbd5e1'
  }
];

export const CATEGORY_MAP: Record<string, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
);

export function getCategoryMeta(cat: string): CategoryMeta {
  return (
    CATEGORY_MAP[cat] || {
      id: 'Other',
      label: cat || 'Other',
      emoji: '📦',
      colorClass: 'text-[#cbd5e1]',
      badgeClass: 'bg-[#cbd5e1]/15 text-[#e2e8f0] border-[#cbd5e1]/30',
      barColor: '#cbd5e1'
    }
  );
}

export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' }
];

export const DEFAULT_SETTINGS: AppSettings = {
  userAName: 'Renato',
  userBName: 'Partner',
  currentUser: 'userA',
  baseCurrency: 'EUR',
  defaultSplitA: 50,
  accounts: DEFAULT_ACCOUNTS,
  accountsUpdatedAt: 1,
  activeAccountId: 'everyday',
  scriptUrl: '',
  secretKey: '',
  sheetUrl: '',
  sheetName: '',
  lastSyncedAt: null
};

export const DEFAULT_FILTERS: ExpenseFilters = {
  search: '',
  datePreset: 'all',
  dateFrom: '',
  dateTo: '',
  categories: [],
  paidBy: 'all',
  splitType: 'all',
  currency: 'all',
  minAmount: '',
  maxAmount: '',
  sortBy: 'date-desc'
};
