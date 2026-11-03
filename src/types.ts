export type PartnerId = 'userA' | 'userB';

export type SplitType = '50-50' | '100-B' | '100-A' | 'custom' | 'settlement';

export type CategoryId =
  | 'Groceries'
  | 'Dining Out'
  | 'Rent & Bills'
  | 'Travel'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Health'
  | 'Home'
  | 'Settlement'
  | 'Other';

export interface AccountGroup {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
  updatedAt?: number;
  isArchived?: boolean;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  amount: number; // Original currency amount
  currency: string; // ISO 4217 e.g. 'EUR', 'USD', 'BRL'
  exchangeRate: number; // 1 unit of `currency` = X units of `baseCurrency`
  baseAmount: number; // Amount in `baseCurrency` (amount * exchangeRate)
  paidBy: PartnerId;
  splitType: SplitType;
  userAShare: number; // Share of `baseAmount` that User A is responsible for
  category: CategoryId | string;
  notes: string;
  isDeleted: boolean;
  updatedAt: number; // Epoch ms
  accountId?: string; // ID of the Account/Group (defaults to 'everyday')
  accountName?: string; // Human-readable Account/Group name for Google Sheet
  dirty?: boolean; // Local-only flag: needs sync to Google Sheet
}

export interface AppSettings {
  userAName: string;
  userBName: string;
  currentUser: PartnerId; // Which partner is using this phone
  baseCurrency: string;
  defaultSplitA: number; // Default % share for User A (default 50)
  accounts: AccountGroup[]; // Separate Tricount-style accounts/groups in the same Sheet
  accountsUpdatedAt?: number; // Epoch ms when accounts list was last created/edited/deleted
  activeAccountId: string; // 'everyday', custom account id, or 'all'
  scriptUrl: string; // Google Apps Script Web App URL
  secretKey: string; // Shared passphrase for the script
  sheetUrl: string; // Direct URL to open the Google Sheet in Drive
  sheetName: string;
  lastSyncedAt: number | null;
}

export type DatePreset =
  | 'all'
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'this-year'
  | 'custom';

export type SortOption =
  | 'date-desc'
  | 'date-asc'
  | 'amount-desc'
  | 'amount-asc';

export interface ExpenseFilters {
  search: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  categories: string[];
  paidBy: 'all' | PartnerId;
  splitType: 'all' | 'shared' | '100-owed' | 'settlement';
  currency: string;
  minAmount: string;
  maxAmount: string;
  sortBy: SortOption;
}

export interface BalanceSummary {
  /** Positive means User B owes User A; Negative means User A owes User B */
  netBalanceA: number;
  totalSpend: number;
  userAPaid: number;
  userBPaid: number;
  userAFairShare: number;
  userBFairShare: number;
  expenseCount: number;
  settlementCount: number;
}
