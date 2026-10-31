import { AppSettings, CategoryId, ExpenseFilters } from '../types';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  emoji: string;
  colorClass: string;
  badgeClass: string;
  barColor: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'Groceries',
    label: 'Groceries',
    emoji: '🛒',
    colorClass: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    barColor: '#10b981'
  },
  {
    id: 'Dining Out',
    label: 'Dining Out',
    emoji: '🍽️',
    colorClass: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    barColor: '#f59e0b'
  },
  {
    id: 'Rent & Bills',
    label: 'Rent & Bills',
    emoji: '🏠',
    colorClass: 'text-blue-400',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    barColor: '#3b82f6'
  },
  {
    id: 'Travel',
    label: 'Travel',
    emoji: '✈️',
    colorClass: 'text-purple-400',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    barColor: '#a855f7'
  },
  {
    id: 'Transport',
    label: 'Transport',
    emoji: '🚗',
    colorClass: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    barColor: '#06b6d4'
  },
  {
    id: 'Shopping',
    label: 'Shopping',
    emoji: '🛍️',
    colorClass: 'text-pink-400',
    badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    barColor: '#ec4899'
  },
  {
    id: 'Home',
    label: 'Home',
    emoji: '🛋️',
    colorClass: 'text-teal-400',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    barColor: '#14b8a6'
  },
  {
    id: 'Entertainment',
    label: 'Entertainment',
    emoji: '🎬',
    colorClass: 'text-indigo-400',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    barColor: '#6366f1'
  },
  {
    id: 'Health',
    label: 'Health',
    emoji: '💊',
    colorClass: 'text-rose-400',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    barColor: '#f43f5e'
  },
  {
    id: 'Settlement',
    label: 'Settlement',
    emoji: '🤝',
    colorClass: 'text-sky-400',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    barColor: '#0ea5e9'
  },
  {
    id: 'Other',
    label: 'Other',
    emoji: '📦',
    colorClass: 'text-slate-400',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    barColor: '#64748b'
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
      colorClass: 'text-slate-400',
      badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      barColor: '#64748b'
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
