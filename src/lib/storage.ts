import { AccountGroup, AppSettings, Expense, PartnerId } from '../types';
import { DEFAULT_ACCOUNTS, DEFAULT_SETTINGS } from './constants';

const EXPENSES_STORAGE_KEY = 'splitsheet_expenses_v1';
const SETTINGS_STORAGE_KEY = 'splitsheet_settings_v1';
const IDB_NAME = 'splitsheet_db';
const IDB_STORE = 'expenses';

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function loadExpensesSync(): Expense[] {
  try {
    const raw = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadExpensesAsync(): Promise<Expense[]> {
  const db = await openIdb();
  if (!db) return loadExpensesSync();

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as Expense[]) : [];
        if (rows.length > 0) {
          resolve(rows);
        } else {
          resolve(loadExpensesSync());
        }
      };
      req.onerror = () => resolve(loadExpensesSync());
    } catch {
      resolve(loadExpensesSync());
    }
  });
}

export async function saveExpenses(expenses: Expense[]): Promise<void> {
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    // Ignore quota errors on localStorage fallback
  }

  const db = await openIdb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.clear();
      for (const exp of expenses) {
        store.put(exp);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export function normalizeAccounts(accounts?: AccountGroup[]): AccountGroup[] {
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return [...DEFAULT_ACCOUNTS];
  }
  const map = new Map<string, AccountGroup>();
  for (const acc of accounts) {
    if (acc && acc.id && acc.name) {
      map.set(acc.id, {
        id: acc.id,
        name: acc.name,
        emoji: acc.emoji || '🏠',
        createdAt: Number(acc.createdAt) || 1,
        isArchived: Boolean(acc.isArchived)
      });
    }
  }
  if (map.size === 0) {
    return [...DEFAULT_ACCOUNTS];
  }
  return Array.from(map.values());
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    const accounts = normalizeAccounts(parsed.accounts);
    const activeAccountId =
      parsed.activeAccountId === 'all' ||
      accounts.some((a) => a.id === parsed.activeAccountId)
        ? parsed.activeAccountId
        : accounts[0].id;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      accounts,
      activeAccountId
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

/**
 * Encodes settings into a shareable URL so Partner B can configure their phone in 1 tap.
 */
export function createPartnerInviteUrl(
  settings: AppSettings,
  targetPartner: PartnerId = 'userB'
): string {
  const payload = {
    userAName: settings.userAName,
    userBName: settings.userBName,
    currentUser: targetPartner,
    baseCurrency: settings.baseCurrency,
    defaultSplitA: settings.defaultSplitA,
    accounts: settings.accounts,
    activeAccountId: settings.activeAccountId,
    scriptUrl: settings.scriptUrl,
    secretKey: settings.secretKey,
    sheetUrl: settings.sheetUrl,
    sheetName: settings.sheetName
  };
  const json = JSON.stringify(payload);
  const encoded = btoa(encodeURIComponent(json));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#invite=${encoded}`;
}

/**
 * Checks if the current URL hash contains a `#invite=...` setup payload.
 */
export function consumePartnerInviteFromHash(): Partial<AppSettings> | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (!hash.startsWith('#invite=')) return null;

  try {
    const encoded = hash.slice('#invite='.length);
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return parsed;
  } catch {
    return null;
  }
}

export interface SyncResult {
  ok: boolean;
  error?: string;
  expenses: Expense[];
  sheetUrl?: string;
  sheetName?: string;
  upsertedCount?: number;
  remoteConfig?: Partial<AppSettings>;
}

/**
 * Synchronizes local dirty expenses and accounts with the Google Apps Script Web App backend
 * and merges all remote rows using last-write-wins (`updatedAt`).
 */
export async function syncWithGoogleSheet(
  localExpenses: Expense[],
  settings: AppSettings,
  pushAll: boolean = false
): Promise<SyncResult> {
  const scriptUrl = settings.scriptUrl.trim();
  const secret = settings.secretKey.trim();

  if (!scriptUrl) {
    return {
      ok: false,
      error: 'Google Apps Script URL is not configured yet.',
      expenses: localExpenses
    };
  }

  const accountNameById = new Map<string, string>(
    settings.accounts.map((a) => [a.id, a.name])
  );

  const upserts = (pushAll ? localExpenses : localExpenses.filter((e) => e.dirty)).map(
    ({ dirty, ...clean }) => {
      const accId = clean.accountId || 'everyday';
      const accName =
        clean.accountName || accountNameById.get(accId) || 'Everyday';
      return {
        ...clean,
        accountId: accId,
        accountName: accName
      };
    }
  );

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      redirect: 'follow',
      body: JSON.stringify({
        action: 'sync',
        secret,
        upserts,
        config: {
          userAName: settings.userAName,
          userBName: settings.userBName,
          baseCurrency: settings.baseCurrency,
          defaultSplitA: String(settings.defaultSplitA),
          accountsJson: JSON.stringify(settings.accounts)
        }
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}: Failed to reach Google Apps Script.`,
        expenses: localExpenses
      };
    }

    const data = await response.json();
    if (!data || !data.ok) {
      return {
        ok: false,
        error: data?.error || 'Google Sheet returned an error.',
        expenses: localExpenses
      };
    }

    const remoteExpenses: Expense[] = Array.isArray(data.expenses) ? data.expenses : [];
    const mergedMap = new Map<string, Expense>();

    // First populate with local expenses
    for (const loc of localExpenses) {
      const accId = loc.accountId || 'everyday';
      mergedMap.set(loc.id, {
        ...loc,
        accountId: accId,
        accountName: loc.accountName || accountNameById.get(accId) || 'Everyday',
        dirty: false
      });
    }

    // Merge remote expenses by updatedAt
    for (const rem of remoteExpenses) {
      if (!rem || !rem.id) continue;
      const existing = mergedMap.get(rem.id);
      if (!existing || (Number(rem.updatedAt) || 0) >= (Number(existing.updatedAt) || 0)) {
        const accId = String(rem.accountId || existing?.accountId || 'everyday').trim() || 'everyday';
        const accName =
          String(rem.accountName || existing?.accountName || accountNameById.get(accId) || 'Everyday').trim() ||
          'Everyday';
        mergedMap.set(rem.id, {
          ...rem,
          amount: Number(rem.amount) || 0,
          exchangeRate: Number(rem.exchangeRate) || 1,
          baseAmount: Number(rem.baseAmount) || Number(rem.amount) || 0,
          userAShare: Number(rem.userAShare) || 0,
          isDeleted: Boolean(rem.isDeleted),
          updatedAt: Number(rem.updatedAt) || 0,
          accountId: accId,
          accountName: accName,
          dirty: false
        });
      }
    }

    const mergedList = Array.from(mergedMap.values());

    // Merge local accounts + remote accountsJson + any accounts discovered on transaction rows
    const mergedAccountsMap = new Map<string, AccountGroup>();
    for (const acc of settings.accounts) {
      mergedAccountsMap.set(acc.id, acc);
    }

    if (data.config?.accountsJson) {
      try {
        const parsedRemoteAccs = JSON.parse(data.config.accountsJson);
        if (Array.isArray(parsedRemoteAccs)) {
          for (const ra of parsedRemoteAccs) {
            if (ra && ra.id && ra.name && !mergedAccountsMap.has(ra.id)) {
              mergedAccountsMap.set(ra.id, {
                id: String(ra.id),
                name: String(ra.name),
                emoji: String(ra.emoji || '🏠'),
                createdAt: Number(ra.createdAt) || Date.now(),
                isArchived: Boolean(ra.isArchived)
              });
            }
          }
        }
      } catch {
        // ignore invalid remote json
      }
    }

    for (const exp of mergedList) {
      if (exp.isDeleted) continue;
      const accId = exp.accountId || 'everyday';
      if (!mergedAccountsMap.has(accId)) {
        mergedAccountsMap.set(accId, {
          id: accId,
          name: exp.accountName || accId,
          emoji: '📁',
          createdAt: Date.now()
        });
      }
    }

    const mergedAccounts = normalizeAccounts(Array.from(mergedAccountsMap.values()));

    return {
      ok: true,
      expenses: mergedList,
      sheetUrl: data.sheetUrl || settings.sheetUrl,
      sheetName: data.sheetName || settings.sheetName,
      upsertedCount: data.upsertedCount || 0,
      remoteConfig: {
        userAName: data.config?.userAName || settings.userAName,
        userBName: data.config?.userBName || settings.userBName,
        baseCurrency: data.config?.baseCurrency || settings.baseCurrency,
        defaultSplitA: Number(data.config?.defaultSplitA) || settings.defaultSplitA,
        accounts: mergedAccounts
      }
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Network error while connecting to Google Sheet.';
    return {
      ok: false,
      error: message,
      expenses: localExpenses
    };
  }
}
