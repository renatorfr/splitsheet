import {
  AppSettings,
  BalanceSummary,
  Expense,
  ExpenseFilters,
  PartnerId,
  SplitType
} from '../types';
import { CURRENCIES } from './constants';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currencyCode: string = 'EUR'): string {
  const safeCurrency = (currencyCode || 'EUR').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: safeCurrency,
      minimumFractionDigits: safeCurrency === 'JPY' ? 0 : 2,
      maximumFractionDigits: safeCurrency === 'JPY' ? 0 : 2
    }).format(amount);
  } catch {
    const found = CURRENCIES.find((c) => c.code === safeCurrency);
    const sym = found ? found.symbol : safeCurrency + ' ';
    return `${sym}${round2(amount).toFixed(2)}`;
  }
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'exp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

/**
 * Computes User A's share of `baseAmount` given a split mode.
 */
export function computeUserAShare(
  baseAmount: number,
  splitType: SplitType,
  paidBy: PartnerId,
  customUserAShare?: number,
  defaultSplitPercentA: number = 50
): number {
  const amt = round2(Math.max(0, baseAmount));
  switch (splitType) {
    case '50-50': {
      const ratio = Math.min(100, Math.max(0, defaultSplitPercentA)) / 100;
      return round2(amt * ratio);
    }
    case '100-B':
      return 0;
    case '100-A':
      return amt;
    case 'settlement':
      return paidBy === 'userA' ? 0 : amt;
    case 'custom': {
      if (typeof customUserAShare === 'number' && !Number.isNaN(customUserAShare)) {
        return round2(Math.min(amt, Math.max(0, customUserAShare)));
      }
      return round2(amt / 2);
    }
    default:
      return round2(amt / 2);
  }
}

/**
 * Positive return value => User B owes User A on this single item.
 * Negative return value => User A owes User B on this single item.
 */
export function computeExpenseCreditA(expense: Expense): number {
  if (expense.isDeleted) return 0;
  const paidByA = expense.paidBy === 'userA' ? expense.baseAmount : 0;
  return round2(paidByA - expense.userAShare);
}

/**
 * Computes overall balance and spending totals across a list of expenses.
 */
export function calculateSummary(expenses: Expense[]): BalanceSummary {
  let netBalanceA = 0;
  let totalSpend = 0;
  let userAPaid = 0;
  let userBPaid = 0;
  let userAFairShare = 0;
  let userBFairShare = 0;
  let expenseCount = 0;
  let settlementCount = 0;

  for (const exp of expenses) {
    if (exp.isDeleted) continue;

    const base = Number(exp.baseAmount) || 0;
    const shareA = Number(exp.userAShare) || 0;
    const shareB = round2(base - shareA);

    const paidA = exp.paidBy === 'userA' ? base : 0;
    netBalanceA = round2(netBalanceA + (paidA - shareA));

    if (exp.splitType === 'settlement' || exp.category === 'Settlement') {
      settlementCount++;
    } else {
      expenseCount++;
      totalSpend = round2(totalSpend + base);
      if (exp.paidBy === 'userA') {
        userAPaid = round2(userAPaid + base);
      } else {
        userBPaid = round2(userBPaid + base);
      }
      userAFairShare = round2(userAFairShare + shareA);
      userBFairShare = round2(userBFairShare + shareB);
    }
  }

  return {
    netBalanceA,
    totalSpend,
    userAPaid,
    userBPaid,
    userAFairShare,
    userBFairShare,
    expenseCount,
    settlementCount
  };
}

export function getDateRangeForPreset(
  preset: ExpenseFilters['datePreset'],
  customFrom: string,
  customTo: string,
  nowDate: Date = new Date()
): { from: string | null; to: string | null } {
  const year = nowDate.getFullYear();
  const month = nowDate.getMonth();

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

  switch (preset) {
    case 'all':
      return { from: null, to: null };
    case 'this-month': {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        from: fmt(year, month, 1),
        to: fmt(year, month, lastDay)
      };
    }
    case 'last-month': {
      const prevDate = new Date(year, month - 1, 1);
      const py = prevDate.getFullYear();
      const pm = prevDate.getMonth();
      const lastDay = new Date(py, pm + 1, 0).getDate();
      return {
        from: fmt(py, pm, 1),
        to: fmt(py, pm, lastDay)
      };
    }
    case 'last-3-months': {
      const startDate = new Date(year, month - 2, 1);
      const lastDay = new Date(year, month + 1, 0).getDate();
      return {
        from: fmt(startDate.getFullYear(), startDate.getMonth(), 1),
        to: fmt(year, month, lastDay)
      };
    }
    case 'this-year':
      return {
        from: `${year}-01-01`,
        to: `${year}-12-31`
      };
    case 'custom':
      return {
        from: customFrom || null,
        to: customTo || null
      };
    default:
      return { from: null, to: null };
  }
}

export function hasActiveFilters(filters: ExpenseFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.datePreset !== 'all' ||
    filters.categories.length > 0 ||
    filters.paidBy !== 'all' ||
    filters.splitType !== 'all' ||
    filters.currency !== 'all' ||
    filters.minAmount.trim() !== '' ||
    filters.maxAmount.trim() !== ''
  );
}

/**
 * Multi-facet instant search and filtering engine.
 */
export function filterAndSortExpenses(
  expenses: Expense[],
  filters: ExpenseFilters,
  settings: AppSettings
): Expense[] {
  const { from, to } = getDateRangeForPreset(
    filters.datePreset,
    filters.dateFrom,
    filters.dateTo
  );

  const searchTokens = filters.search
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const minAmt = filters.minAmount.trim() !== '' ? Number(filters.minAmount) : null;
  const maxAmt = filters.maxAmount.trim() !== '' ? Number(filters.maxAmount) : null;

  const filtered = expenses.filter((exp) => {
    if (exp.isDeleted) return false;

    // 1. Date range filter
    if (from && exp.date < from) return false;
    if (to && exp.date > to) return false;

    // 2. Category filter
    if (filters.categories.length > 0 && !filters.categories.includes(exp.category)) {
      return false;
    }

    // 3. Paid By filter
    if (filters.paidBy !== 'all' && exp.paidBy !== filters.paidBy) {
      return false;
    }

    // 4. Split Type filter
    if (filters.splitType !== 'all') {
      if (filters.splitType === 'settlement' && exp.splitType !== 'settlement') {
        return false;
      }
      if (
        filters.splitType === '100-owed' &&
        exp.splitType !== '100-A' &&
        exp.splitType !== '100-B'
      ) {
        return false;
      }
      if (
        filters.splitType === 'shared' &&
        exp.splitType !== '50-50' &&
        exp.splitType !== 'custom'
      ) {
        return false;
      }
    }

    // 5. Currency filter
    if (filters.currency !== 'all' && exp.currency !== filters.currency) {
      return false;
    }

    // 6. Amount range filter (checks baseAmount)
    if (minAmt !== null && !Number.isNaN(minAmt) && exp.baseAmount < minAmt) {
      return false;
    }
    if (maxAmt !== null && !Number.isNaN(maxAmt) && exp.baseAmount > maxAmt) {
      return false;
    }

    // 7. Multi-token text search across title, notes, category, accountName, payer, currency, amount
    if (searchTokens.length > 0) {
      const payerName =
        exp.paidBy === 'userA' ? settings.userAName : settings.userBName;
      const haystack = [
        exp.title,
        exp.notes,
        exp.category,
        exp.accountName || '',
        exp.currency,
        payerName,
        exp.date,
        exp.amount.toFixed(2),
        exp.baseAmount.toFixed(2)
      ]
        .join(' ')
        .toLowerCase();

      for (const token of searchTokens) {
        if (!haystack.includes(token)) return false;
      }
    }

    return true;
  });

  // Sort results
  filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'date-desc':
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return b.updatedAt - a.updatedAt;
      case 'date-asc':
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.updatedAt - b.updatedAt;
      case 'amount-desc':
        return b.baseAmount - a.baseAmount;
      case 'amount-asc':
        return a.baseAmount - b.baseAmount;
      default:
        return b.date.localeCompare(a.date);
    }
  });

  return filtered;
}

/**
 * Fetches live/historical exchange rate from the free Frankfurter API (ECB rates).
 */
export async function fetchExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  dateStr?: string
): Promise<number | null> {
  const from = fromCurrency.trim().toUpperCase();
  const to = toCurrency.trim().toUpperCase();
  if (from === to) return 1;

  const dateSegment =
    dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : 'latest';

  try {
    const res = await fetch(
      `https://api.frankfurter.app/${dateSegment}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    );
    if (!res.ok) {
      const fallback = await fetch(
        `https://api.frankfurter.app/latest?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      if (!fallback.ok) return null;
      const data = await fallback.json();
      return typeof data?.rates?.[to] === 'number' ? data.rates[to] : null;
    }
    const data = await res.json();
    return typeof data?.rates?.[to] === 'number' ? data.rates[to] : null;
  } catch {
    return null;
  }
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeDate(raw: string): string {
  const cleaned = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.slice(0, 10);
  }
  const dmy = cleaned.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }
  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function guessCategory(title: string, rawCategory?: string): string {
  if (rawCategory && rawCategory.trim()) {
    const c = rawCategory.trim().toLowerCase();
    if (c.includes('grocer') || c.includes('supermarket') || c.includes('market')) return 'Groceries';
    if (c.includes('restaur') || c.includes('dining') || c.includes('food') || c.includes('bar')) return 'Dining Out';
    if (c.includes('rent') || c.includes('bill') || c.includes('utilit') || c.includes('electric') || c.includes('internet')) return 'Rent & Bills';
    if (c.includes('travel') || c.includes('hotel') || c.includes('flight') || c.includes('airbnb')) return 'Travel';
    if (c.includes('transp') || c.includes('uber') || c.includes('gas') || c.includes('fuel') || c.includes('train')) return 'Transport';
    if (c.includes('shop') || c.includes('cloth') || c.includes('amazon')) return 'Shopping';
    if (c.includes('home') || c.includes('ikea') || c.includes('furnit')) return 'Home';
    if (c.includes('entert') || c.includes('movie') || c.includes('concert')) return 'Entertainment';
    if (c.includes('health') || c.includes('pharm') || c.includes('doctor')) return 'Health';
    if (c.includes('settle') || c.includes('transfer') || c.includes('reimburs')) return 'Settlement';
  }
  const t = title.toLowerCase();
  if (/(supermarket|grocery|groceries|lidl|aldi|carrefour|whole foods|trader joe|tesco|mercado|pao de acucar)/.test(t)) return 'Groceries';
  if (/(dinner|lunch|breakfast|coffee|cafe|restaurant|pizza|sushi|burger|bar|drinks|ifood|ubereats)/.test(t)) return 'Dining Out';
  if (/(rent|electricity|water|internet|wifi|gas bill|utility|condo)/.test(t)) return 'Rent & Bills';
  if (/(flight|hotel|airbnb|booking|hostel|trip|vacation)/.test(t)) return 'Travel';
  if (/(uber|lyft|taxi|metro|train|bus|fuel|gasoline|parking|toll)/.test(t)) return 'Transport';
  if (/(pharmacy|doctor|dentist|medicine|gym)/.test(t)) return 'Health';
  if (/(cinema|movie|netflix|spotify|concert|tickets)/.test(t)) return 'Entertainment';
  return 'Other';
}

/**
 * Parses Tricount, Splitwise, or generic CSV files into SplitSheet expenses.
 */
export function parseCsvImport(
  csvText: string,
  settings: AppSettings,
  targetAccountId?: string
): Expense[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;
  const delimiter =
    tabCount > commaCount && tabCount > semiCount
      ? '\t'
      : semiCount > commaCount
        ? ';'
        : ',';

  const rawHeaders = splitCsvLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().replace(/^["']|["']$/g, '').trim()
  );

  const findCol = (patterns: RegExp[]) =>
    rawHeaders.findIndex((h) => patterns.some((p) => p.test(h)));

  const titleIdx = findCol([/^(title|description|expense|name|item|what|concept)$/i, /title|desc/i]);
  const amountIdx = findCol([/^(amount|cost|total|value|price|paid)$/i, /amount|cost|total/i]);
  const currencyIdx = findCol([/^(currency|curr|iso)$/i, /currency/i]);
  const paidByIdx = findCol([/^(paid by|payer|who paid|by|paidby|author)$/i, /paid|payer/i]);
  const dateIdx = findCol([/^(date|when|created|day|time)$/i, /date/i]);
  const categoryIdx = findCol([/^(category|type|tag)$/i, /cat/i]);
  const notesIdx = findCol([/^(notes|note|comment|memo)$/i]);
  const userAShareIdx = findCol([
    new RegExp(`^(${settings.userAName.toLowerCase()}|userashare|share a)`, 'i')
  ]);

  const fallbackAccountId =
    targetAccountId && targetAccountId !== 'all'
      ? targetAccountId
      : settings.activeAccountId !== 'all'
        ? settings.activeAccountId
        : settings.accounts[0]?.id || 'everyday';
  const fallbackAccountName =
    settings.accounts.find((a) => a.id === fallbackAccountId)?.name || 'Everyday';

  const results: Expense[] = [];
  const now = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    if (cols.length < 2) continue;

    const title = (titleIdx >= 0 ? cols[titleIdx] : cols[0])?.trim() || 'Imported Expense';
    if (/^(total|balance)$/i.test(title)) continue;

    const rawAmtStr = (amountIdx >= 0 ? cols[amountIdx] : cols[1]) || '0';
    let normalizedAmt = rawAmtStr.replace(/[^0-9,.-]/g, '');
    if (normalizedAmt.includes(',') && !normalizedAmt.includes('.')) {
      normalizedAmt = normalizedAmt.replace(',', '.');
    } else if (
      normalizedAmt.includes(',') &&
      normalizedAmt.includes('.') &&
      normalizedAmt.lastIndexOf(',') > normalizedAmt.lastIndexOf('.')
    ) {
      normalizedAmt = normalizedAmt.replace(/\./g, '').replace(',', '.');
    } else {
      normalizedAmt = normalizedAmt.replace(/,/g, '');
    }

    const amount = Math.abs(parseFloat(normalizedAmt));
    if (!amount || Number.isNaN(amount) || amount <= 0) continue;

    const currency =
      (currencyIdx >= 0 && cols[currencyIdx]
        ? cols[currencyIdx].trim().toUpperCase()
        : settings.baseCurrency) || settings.baseCurrency;

    const rawPayer = paidByIdx >= 0 ? (cols[paidByIdx] || '').trim().toLowerCase() : '';
    const userBLower = settings.userBName.toLowerCase();
    const paidBy: PartnerId =
      rawPayer &&
      (rawPayer === 'userb' ||
        (userBLower && rawPayer.includes(userBLower)))
        ? 'userB'
        : 'userA';

    const date = dateIdx >= 0 && cols[dateIdx] ? normalizeDate(cols[dateIdx]) : new Date().toISOString().slice(0, 10);
    const rawCat = categoryIdx >= 0 ? cols[categoryIdx] : '';
    const category = guessCategory(title, rawCat);
    const notes = notesIdx >= 0 && cols[notesIdx] ? cols[notesIdx] : 'Imported via CSV';

    const isSettlement = category === 'Settlement' || /settle|reimburs|transfer/i.test(title);
    const splitType: SplitType = isSettlement ? 'settlement' : '50-50';

    let userAShare = computeUserAShare(amount, splitType, paidBy, undefined, settings.defaultSplitA);
    if (userAShareIdx >= 0 && cols[userAShareIdx]) {
      const parsedShare = Math.abs(parseFloat(cols[userAShareIdx].replace(',', '.')));
      if (!Number.isNaN(parsedShare) && parsedShare <= amount) {
        userAShare = round2(parsedShare);
      }
    }

    results.push({
      id: generateId(),
      date,
      title,
      amount: round2(amount),
      currency,
      exchangeRate: 1,
      baseAmount: round2(amount),
      paidBy,
      splitType,
      userAShare,
      category,
      notes,
      isDeleted: false,
      updatedAt: now + i,
      accountId: fallbackAccountId,
      accountName: fallbackAccountName,
      dirty: true
    });
  }

  return results;
}

/**
 * Exports expenses to a clean CSV string.
 */
export function exportExpensesToCsv(expenses: Expense[], settings: AppSettings): string {
  const headers = [
    'Date',
    'Account',
    'Title',
    'Category',
    'Amount',
    'Currency',
    'ExchangeRate',
    `BaseAmount (${settings.baseCurrency})`,
    'PaidBy',
    'SplitType',
    `${settings.userAName} Share`,
    `${settings.userBName} Share`,
    'Notes',
    'ID'
  ];

  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = expenses
    .filter((e) => !e.isDeleted)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => {
      const payerName = e.paidBy === 'userA' ? settings.userAName : settings.userBName;
      const shareB = round2(e.baseAmount - e.userAShare);
      const accName =
        e.accountName ||
        settings.accounts.find((a) => a.id === (e.accountId || 'everyday'))?.name ||
        'Everyday';
      return [
        e.date,
        accName,
        e.title,
        e.category,
        e.amount.toFixed(2),
        e.currency,
        e.exchangeRate,
        e.baseAmount.toFixed(2),
        payerName,
        e.splitType,
        e.userAShare.toFixed(2),
        shareB.toFixed(2),
        e.notes,
        e.id
      ]
        .map(escapeCell)
        .join(',');
    });

  return [headers.map(escapeCell).join(','), ...rows].join('\n');
}
