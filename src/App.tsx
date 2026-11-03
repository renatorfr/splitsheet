import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  ListFilter,
  Plus,
  Settings,
  Table2
} from 'lucide-react';
import { AccountGroup, AppSettings, Expense, ExpenseFilters, PartnerId } from './types';
import { DEFAULT_ACCOUNTS, DEFAULT_FILTERS } from './lib/constants';
import {
  calculateSummary,
  computeUserAShare,
  filterAndSortExpenses,
  generateId,
  hasActiveFilters,
  round2
} from './lib/finance';
import {
  consumePartnerInviteFromHash,
  loadExpensesAsync,
  loadExpensesSync,
  loadSettings,
  normalizeAccounts,
  saveExpenses,
  saveSettings,
  syncWithGoogleSheet
} from './lib/storage';
import { AccountsBar } from './components/AccountsBar';
import { BalanceHeader } from './components/BalanceHeader';
import { SearchFilterBar } from './components/SearchFilterBar';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { AnalyticsView } from './components/AnalyticsView';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpensesSync());
  const [filters, setFilters] = useState<ExpenseFilters>(() => ({
    ...DEFAULT_FILTERS
  }));

  const [activeTab, setActiveTab] = useState<'expenses' | 'analytics'>('expenses');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [presetSettlement, setPresetSettlement] = useState<{
    paidBy: PartnerId;
    amount: number;
  } | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [inviteBanner, setInviteBanner] = useState<string | null>(null);

  // Hydrate from IndexedDB + check URL hash for partner invite link
  useEffect(() => {
    let mounted = true;
    loadExpensesAsync().then((loaded) => {
      if (mounted && loaded.length > 0) {
        setExpenses(loaded);
      }
    });

    const invite = consumePartnerInviteFromHash();
    if (invite) {
      setSettings((prev) => {
        const accounts = normalizeAccounts(invite.accounts || prev.accounts);
        const merged: AppSettings = {
          ...prev,
          ...invite,
          accounts
        };
        saveSettings(merged);
        return merged;
      });
      setInviteBanner(
        `Configured for ${
          invite.currentUser === 'userB'
            ? invite.userBName || 'Partner B'
            : invite.userAName || 'Partner A'
        }! Syncing with shared Google Sheet…`
      );
      setTimeout(() => setInviteBanner(null), 5000);
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Core sync routine with Google Sheet
  const triggerSync = useCallback(
    async (
      currentExpenses: Expense[],
      currentSettings: AppSettings,
      pushAll: boolean = false
    ) => {
      if (!currentSettings.scriptUrl.trim()) return;
      setIsSyncing(true);
      setSyncError(null);

      const result = await syncWithGoogleSheet(
        currentExpenses,
        currentSettings,
        pushAll
      );

      setIsSyncing(false);
      if (!result.ok) {
        setSyncError(result.error || 'Failed to sync with Google Sheet');
        return;
      }

      setExpenses(result.expenses);
      await saveExpenses(result.expenses);

      setSettings((prev) => {
        const nextAccounts = normalizeAccounts(
          result.remoteConfig?.accounts || prev.accounts
        );
        const nextActiveId =
          prev.activeAccountId === 'all' ||
          nextAccounts.some((a) => a.id === prev.activeAccountId)
            ? prev.activeAccountId
            : nextAccounts[0].id;

        const next: AppSettings = {
          ...prev,
          ...(result.remoteConfig || {}),
          accounts: nextAccounts,
          activeAccountId: nextActiveId,
          sheetUrl: result.sheetUrl || prev.sheetUrl,
          sheetName: result.sheetName || prev.sheetName,
          lastSyncedAt: Date.now()
        };
        saveSettings(next);
        return next;
      });
    },
    []
  );

  // Initial sync on load & when network comes back online
  useEffect(() => {
    if (settings.scriptUrl.trim()) {
      triggerSync(expenses, settings, false);
    }
    const onOnline = () => {
      if (settings.scriptUrl.trim()) {
        triggerSync(expenses, settings, false);
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [settings.scriptUrl]);

  // Scope expenses by the currently selected Account (or 'all')
  const accountScopedExpenses = useMemo(() => {
    const nonDeleted = expenses.filter((e) => !e.isDeleted);
    if (settings.activeAccountId === 'all') {
      return nonDeleted;
    }
    return nonDeleted.filter(
      (e) => (e.accountId || 'everyday') === settings.activeAccountId
    );
  }, [expenses, settings.activeAccountId]);

  const activeAccountLabel = useMemo(() => {
    if (settings.activeAccountId === 'all') {
      return '✨ All Accounts';
    }
    const found = settings.accounts.find((a) => a.id === settings.activeAccountId);
    return found ? `${found.emoji} ${found.name}` : '🏠 Everyday';
  }, [settings.accounts, settings.activeAccountId]);

  const overallSummary = useMemo(
    () => calculateSummary(accountScopedExpenses),
    [accountScopedExpenses]
  );

  const filteredExpenses = useMemo(
    () => filterAndSortExpenses(accountScopedExpenses, filters, settings),
    [accountScopedExpenses, filters, settings]
  );

  const filteredSummary = useMemo(
    () => calculateSummary(filteredExpenses),
    [filteredExpenses]
  );

  const availableCurrencies = useMemo(() => {
    const set = new Set<string>([settings.baseCurrency]);
    for (const e of accountScopedExpenses) {
      if (e.currency) set.add(e.currency.toUpperCase());
    }
    return Array.from(set);
  }, [accountScopedExpenses, settings.baseCurrency]);

  const dirtyCount = useMemo(
    () => expenses.filter((e) => e.dirty).length,
    [expenses]
  );

  // Account Handlers (Create, Edit Name/Icon, Delete with Expenses)
  const handleSelectAccount = (accountId: string) => {
    const next: AppSettings = { ...settings, activeAccountId: accountId };
    setSettings(next);
    saveSettings(next);
  };

  const handleCreateAccount = (created: AccountGroup) => {
    const now = Date.now();
    const nextAccounts = [...settings.accounts, created];
    const nextSettings: AppSettings = {
      ...settings,
      accounts: nextAccounts,
      accountsUpdatedAt: now,
      activeAccountId: created.id
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);

    if (nextSettings.scriptUrl.trim()) {
      triggerSync(expenses, nextSettings, false);
    }
  };

  const handleEditAccount = async (updated: AccountGroup) => {
    const now = Date.now();
    const nextAccounts = settings.accounts.map((a) =>
      a.id === updated.id ? { ...updated, updatedAt: now } : a
    );

    let expensesChanged = false;
    const updatedExpenses = expenses.map((e) => {
      if ((e.accountId || 'everyday') === updated.id && e.accountName !== updated.name) {
        expensesChanged = true;
        return {
          ...e,
          accountName: updated.name,
          updatedAt: now,
          dirty: true
        };
      }
      return e;
    });

    if (expensesChanged) {
      setExpenses(updatedExpenses);
      await saveExpenses(updatedExpenses);
    }

    const nextSettings: AppSettings = {
      ...settings,
      accounts: nextAccounts,
      accountsUpdatedAt: now
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);

    if (nextSettings.scriptUrl.trim()) {
      triggerSync(updatedExpenses, nextSettings, false);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const now = Date.now();

    // Soft-delete all expenses belonging to the deleted account so they also delete on the Google Sheet
    let expensesChanged = false;
    const updatedExpenses = expenses.map((e) => {
      if (!e.isDeleted && (e.accountId || 'everyday') === accountId) {
        expensesChanged = true;
        return {
          ...e,
          isDeleted: true,
          updatedAt: now,
          dirty: true
        };
      }
      return e;
    });

    if (expensesChanged) {
      setExpenses(updatedExpenses);
      await saveExpenses(updatedExpenses);
    }

    const remaining = settings.accounts.filter((a) => a.id !== accountId);
    const nextAccounts: AccountGroup[] =
      remaining.length > 0
        ? remaining
        : [
            {
              ...DEFAULT_ACCOUNTS[0],
              createdAt: now,
              updatedAt: now
            }
          ];

    const nextActiveId =
      settings.activeAccountId === accountId
        ? nextAccounts[0].id
        : settings.activeAccountId;

    const nextSettings: AppSettings = {
      ...settings,
      accounts: nextAccounts,
      accountsUpdatedAt: now,
      activeAccountId: nextActiveId
    };
    setSettings(nextSettings);
    saveSettings(nextSettings);

    if (nextSettings.scriptUrl.trim()) {
      triggerSync(updatedExpenses, nextSettings, false);
    }
  };

  // Expense Handlers
  const handleSaveExpense = async (expense: Expense) => {
    const exists = expenses.some((e) => e.id === expense.id);
    const next = exists
      ? expenses.map((e) => (e.id === expense.id ? expense : e))
      : [expense, ...expenses];

    setExpenses(next);
    await saveExpenses(next);

    if (settings.scriptUrl.trim()) {
      triggerSync(next, settings, false);
    }
  };

  const handleDeleteExpense = async (expense: Expense) => {
    const tombstone: Expense = {
      ...expense,
      isDeleted: true,
      updatedAt: Date.now(),
      dirty: true
    };
    const next = expenses.map((e) => (e.id === expense.id ? tombstone : e));
    setExpenses(next);
    await saveExpenses(next);

    if (settings.scriptUrl.trim()) {
      triggerSync(next, settings, false);
    }
  };

  const handleImportExpenses = async (imported: Expense[]) => {
    const next = [...imported, ...expenses];
    setExpenses(next);
    await saveExpenses(next);

    if (settings.scriptUrl.trim()) {
      triggerSync(next, settings, false);
    }
  };

  const handleSettleUpClick = () => {
    const { netBalanceA } = overallSummary;
    const abs = round2(Math.abs(netBalanceA));
    if (abs < 0.01) return;

    const payer: PartnerId = netBalanceA > 0 ? 'userB' : 'userA';
    setEditingExpense(null);
    setPresetSettlement({ paidBy: payer, amount: abs });
    setIsExpenseModalOpen(true);
  };

  const handleSaveSettings = (nextSettings: AppSettings, shouldSync?: boolean) => {
    setSettings(nextSettings);
    saveSettings(nextSettings);
    if (shouldSync && nextSettings.scriptUrl.trim()) {
      triggerSync(expenses, nextSettings, true);
    }
  };

  const handleClearAllLocal = async () => {
    if (
      !window.confirm(
        'Clear local cache on this device? (Rows already synced in your Google Sheet will remain safe in Google Drive).'
      )
    ) {
      return;
    }
    setExpenses([]);
    await saveExpenses([]);
    setIsSettingsModalOpen(false);
  };

  const handleLoadDemoData = async () => {
    const now = Date.now();
    const today = new Date();
    const fmtDate = (daysAgo: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return d.toISOString().slice(0, 10);
    };

    const targetAccId =
      settings.activeAccountId !== 'all'
        ? settings.activeAccountId
        : settings.accounts[0]?.id || 'everyday';
    const targetAccName =
      settings.accounts.find((a) => a.id === targetAccId)?.name || 'Everyday';

    const cur = settings.baseCurrency;
    const demo: Expense[] = [
      {
        id: generateId(),
        date: fmtDate(1),
        title: 'Weekly Supermarket Groceries',
        amount: 94.6,
        currency: cur,
        exchangeRate: 1,
        baseAmount: 94.6,
        paidBy: 'userA',
        splitType: '50-50',
        userAShare: computeUserAShare(94.6, '50-50', 'userA', undefined, settings.defaultSplitA),
        category: 'Groceries',
        notes: 'Fruits, veggies, coffee, olive oil',
        isDeleted: false,
        updatedAt: now - 1000,
        accountId: targetAccId,
        accountName: targetAccName,
        dirty: true
      },
      {
        id: generateId(),
        date: fmtDate(3),
        title: 'Date Night Thai Restaurant',
        amount: 68.0,
        currency: cur,
        exchangeRate: 1,
        baseAmount: 68.0,
        paidBy: 'userB',
        splitType: '50-50',
        userAShare: computeUserAShare(68.0, '50-50', 'userB', undefined, settings.defaultSplitA),
        category: 'Dining Out',
        notes: 'Pad Thai + drinks',
        isDeleted: false,
        updatedAt: now - 2000,
        accountId: targetAccId,
        accountName: targetAccName,
        dirty: true
      },
      {
        id: generateId(),
        date: fmtDate(6),
        title: 'Fiber Internet & Electricity',
        amount: 112.4,
        currency: cur,
        exchangeRate: 1,
        baseAmount: 112.4,
        paidBy: 'userA',
        splitType: '50-50',
        userAShare: computeUserAShare(112.4, '50-50', 'userA', undefined, settings.defaultSplitA),
        category: 'Rent & Bills',
        notes: 'Monthly utilities',
        isDeleted: false,
        updatedAt: now - 3000,
        accountId: targetAccId,
        accountName: targetAccName,
        dirty: true
      },
      {
        id: generateId(),
        date: fmtDate(9),
        title: 'Pharmacy — Cold Medicine',
        amount: 24.5,
        currency: cur,
        exchangeRate: 1,
        baseAmount: 24.5,
        paidBy: 'userA',
        splitType: '100-B',
        userAShare: 0,
        category: 'Health',
        notes: `Picked up for ${settings.userBName}`,
        isDeleted: false,
        updatedAt: now - 4000,
        accountId: targetAccId,
        accountName: targetAccName,
        dirty: true
      },
      {
        id: generateId(),
        date: fmtDate(14),
        title: 'Weekend Train Tickets',
        amount: 56.0,
        currency: cur,
        exchangeRate: 1,
        baseAmount: 56.0,
        paidBy: 'userB',
        splitType: '50-50',
        userAShare: computeUserAShare(56.0, '50-50', 'userB', undefined, settings.defaultSplitA),
        category: 'Travel',
        notes: 'Coastal day trip',
        isDeleted: false,
        updatedAt: now - 5000,
        accountId: targetAccId,
        accountName: targetAccName,
        dirty: true
      }
    ];

    const next = [...demo, ...expenses];
    setExpenses(next);
    await saveExpenses(next);
  };

  return (
    <div className="min-h-screen bg-[#13111c] text-slate-100 pb-24">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-[#13111c]/85 backdrop-blur-md border-b border-[#252236]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c4b5fd] to-[#fbcfe8] flex items-center justify-center shadow-md shadow-[#c4b5fd]/15">
              <Table2 className="w-5 h-5 text-[#181622] stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white leading-none">
                SplitSheet
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {settings.userAName} &amp; {settings.userBName}
              </p>
            </div>
          </div>

          {/* Center Tabs */}
          <div className="inline-flex rounded-xl bg-[#1e1b2b] p-1 border border-[#332f4a]">
            <button
              type="button"
              onClick={() => setActiveTab('expenses')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-[#c4b5fd] text-[#181622] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Expenses</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-[#c4b5fd] text-[#181622] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="p-2 rounded-xl bg-[#1e1b2b] hover:bg-[#2a263d] text-slate-300 border border-[#332f4a] transition cursor-pointer"
              title="Tricount / CSV Import & Export"
              aria-label="Import or Export CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#c4b5fd]" />
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 rounded-xl bg-[#1e1b2b] hover:bg-[#2a263d] text-slate-300 border border-[#332f4a] transition cursor-pointer"
              title="Couple & Google Sheet Settings"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {inviteBanner && (
          <div className="p-3.5 rounded-2xl bg-[#c4b5fd]/15 border border-[#c4b5fd]/40 text-xs sm:text-sm font-medium text-[#ddd6fe]">
            {inviteBanner}
          </div>
        )}

        {/* Tricount-Style Accounts / Groups Switcher Bar */}
        <AccountsBar
          settings={settings}
          expenses={expenses}
          onSelectAccount={handleSelectAccount}
          onCreateAccount={handleCreateAccount}
          onEditAccount={handleEditAccount}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* Top Balance & Google Sheet Sync Card */}
        <BalanceHeader
          summary={overallSummary}
          settings={settings}
          activeAccountLabel={activeAccountLabel}
          dirtyCount={dirtyCount}
          isSyncing={isSyncing}
          syncError={syncError}
          onAddExpense={() => {
            setEditingExpense(null);
            setPresetSettlement(null);
            setIsExpenseModalOpen(true);
          }}
          onSettleUp={handleSettleUpClick}
          onSyncNow={() => triggerSync(expenses, settings, true)}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />

        {activeTab === 'expenses' ? (
          <>
            <SearchFilterBar
              filters={filters}
              settings={settings}
              filteredSummary={filteredSummary}
              totalCount={accountScopedExpenses.length}
              filteredCount={filteredExpenses.length}
              availableCurrencies={availableCurrencies}
              onChange={setFilters}
            />

            <ExpenseList
              expenses={filteredExpenses}
              settings={settings}
              isFiltered={hasActiveFilters(filters)}
              onEdit={(exp) => {
                setEditingExpense(exp);
                setPresetSettlement(null);
                setIsExpenseModalOpen(true);
              }}
              onDelete={handleDeleteExpense}
              onAddFirst={() => {
                setEditingExpense(null);
                setPresetSettlement(null);
                setIsExpenseModalOpen(true);
              }}
              onLoadDemo={handleLoadDemoData}
            />
          </>
        ) : (
          <AnalyticsView
            expenses={accountScopedExpenses}
            settings={settings}
            onSelectCategoryFilter={(cat) => {
              setFilters({ ...filters, categories: [cat] });
              setActiveTab('expenses');
            }}
          />
        )}
      </main>

      {/* Floating Action Button for Quick Mobile Logging */}
      <button
        type="button"
        onClick={() => {
          setEditingExpense(null);
          setPresetSettlement(null);
          setIsExpenseModalOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 sm:hidden w-14 h-14 rounded-2xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] shadow-xl shadow-[#c4b5fd]/30 flex items-center justify-center transition cursor-pointer"
        aria-label="Add Expense"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        editingExpense={editingExpense}
        presetSettlement={presetSettlement}
        settings={settings}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
          setPresetSettlement(null);
        }}
        onSave={handleSaveExpense}
      />

      <ImportExportModal
        isOpen={isImportModalOpen}
        expenses={expenses}
        settings={settings}
        onClose={() => setIsImportModalOpen(false)}
        onImportExpenses={handleImportExpenses}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        settings={settings}
        isSyncing={isSyncing}
        syncError={syncError}
        onClose={() => setIsSettingsModalOpen(false)}
        onSaveSettings={handleSaveSettings}
        onClearAllLocal={handleClearAllLocal}
      />
    </div>
  );
};

export default App;
