import React, { useState } from 'react';
import { FolderPlus, Layers, Pencil, Plus, Trash2, X, Check } from 'lucide-react';
import { AccountGroup, AppSettings, Expense } from '../types';
import { ACCOUNT_EMOJIS } from '../lib/constants';
import { calculateSummary, formatMoney, generateId, round2 } from '../lib/finance';

interface AccountsBarProps {
  settings: AppSettings;
  expenses: Expense[];
  onSelectAccount: (accountId: string) => void;
  onUpdateAccounts: (
    nextAccounts: AccountGroup[],
    nextActiveId?: string,
    renamedAccount?: { id: string; name: string }
  ) => void;
}

export const AccountsBar: React.FC<AccountsBarProps> = ({
  settings,
  expenses,
  onSelectAccount,
  onUpdateAccounts
}) => {
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('✈️');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🏠');

  // Compute per-account mini net balances
  const balanceByAccount = React.useMemo(() => {
    const map = new Map<string, { net: number; count: number }>();
    for (const acc of settings.accounts) {
      map.set(acc.id, { net: 0, count: 0 });
    }
    for (const exp of expenses) {
      if (exp.isDeleted) continue;
      const accId = exp.accountId || 'everyday';
      const sub = calculateSummary([exp]);
      const prev = map.get(accId) || { net: 0, count: 0 };
      prev.net = round2(prev.net + sub.netBalanceA);
      prev.count += 1;
      map.set(accId, prev);
    }
    return map;
  }, [expenses, settings.accounts]);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const slug =
      trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 24) || generateId();

    const uniqueId = settings.accounts.some((a) => a.id === slug)
      ? `${slug}-${Date.now().toString(36).slice(-4)}`
      : slug;

    const created: AccountGroup = {
      id: uniqueId,
      name: trimmed,
      emoji: newEmoji || '📁',
      createdAt: Date.now()
    };

    const nextAccounts = [...settings.accounts, created];
    onUpdateAccounts(nextAccounts, created.id);
    setNewName('');
    setNewEmoji('🏖️');
    setIsManageOpen(false);
  };

  const handleSaveRename = (accId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const nextAccounts = settings.accounts.map((a) =>
      a.id === accId ? { ...a, name: trimmed, emoji: editEmoji } : a
    );
    onUpdateAccounts(nextAccounts, undefined, { id: accId, name: trimmed });
    setEditingId(null);
  };

  const handleDeleteAccount = (acc: AccountGroup) => {
    if (settings.accounts.length <= 1) {
      window.alert('You must keep at least one account.');
      return;
    }
    const stats = balanceByAccount.get(acc.id);
    const count = stats?.count || 0;
    const msg =
      count > 0
        ? `Delete "${acc.name}"? Its ${count} expense(s) will be moved to "${settings.accounts[0].name}".`
        : `Delete account "${acc.name}"?`;
    if (!window.confirm(msg)) return;

    const remaining = settings.accounts.filter((a) => a.id !== acc.id);
    const nextActive =
      settings.activeAccountId === acc.id ? remaining[0].id : settings.activeAccountId;
    onUpdateAccounts(remaining, nextActive);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1">
          {settings.accounts.map((acc) => {
            const active = settings.activeAccountId === acc.id;
            const stats = balanceByAccount.get(acc.id);
            const absNet = Math.abs(round2(stats?.net || 0));

            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccount(acc.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap border transition cursor-pointer ${
                  active
                    ? 'bg-[#c4b5fd] text-[#181622] border-[#ddd6fe] shadow-md shadow-[#c4b5fd]/15'
                    : 'bg-[#1e1b2b]/90 text-slate-300 border-[#332f4a] hover:border-[#c4b5fd]/50 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{acc.emoji}</span>
                <span>{acc.name}</span>
                {absNet >= 0.01 ? (
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                      active
                        ? 'bg-[#181622]/20 text-[#181622]'
                        : 'bg-[#2a263d] text-[#ddd6fe]'
                    }`}
                  >
                    {formatMoney(absNet, settings.baseCurrency)}
                  </span>
                ) : (
                  (stats?.count || 0) > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        active
                          ? 'bg-[#181622]/15 text-[#181622]'
                          : 'bg-[#a7f3d0]/15 text-[#a7f3d0]'
                      }`}
                    >
                      ✓
                    </span>
                  )
                )}
              </button>
            );
          })}

          {/* All Accounts Combined View Pill */}
          {settings.accounts.length > 1 && (
            <button
              type="button"
              onClick={() => onSelectAccount('all')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap border transition cursor-pointer ${
                settings.activeAccountId === 'all'
                  ? 'bg-[#bae6fd] text-[#181622] border-[#e0f2fe] shadow-md shadow-[#bae6fd]/15'
                  : 'bg-[#1e1b2b]/90 text-slate-300 border-[#332f4a] hover:border-[#bae6fd]/50 hover:text-white'
              }`}
              title="View and search across all accounts combined"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Accounts</span>
            </button>
          )}
        </div>

        {/* New / Manage Accounts Button */}
        <button
          type="button"
          onClick={() => setIsManageOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#1e1b2b] hover:bg-[#282438] text-[#ddd6fe] border border-[#332f4a] text-xs font-semibold shrink-0 transition cursor-pointer"
          title="Add or manage expense accounts/groups"
        >
          <FolderPlus className="w-4 h-4 text-[#c4b5fd]" />
          <span className="hidden sm:inline">Accounts</span>
        </button>
      </div>

      {/* Modal to Create & Manage Accounts */}
      {isManageOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f0d16]/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1e1b2b] border border-[#332f4a] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#1e1b2b]/95 backdrop-blur border-b border-[#332f4a]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Expense Accounts / Groups
                </h3>
                <p className="text-xs text-slate-400">
                  Separate trips & budgets — all stored in your single Google Sheet
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2a263d] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Create New Account Form */}
              <form
                onSubmit={handleCreateAccount}
                className="p-4 rounded-2xl bg-[#151320] border border-[#332f4a] space-y-3"
              >
                <label className="block text-xs font-bold uppercase tracking-wider text-[#c4b5fd]">
                  Create New Account Group
                </label>

                <div className="flex flex-wrap gap-1.5">
                  {ACCOUNT_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewEmoji(em)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-base border transition cursor-pointer ${
                        newEmoji === em
                          ? 'bg-[#c4b5fd]/25 border-[#c4b5fd]'
                          : 'bg-[#1e1b2b] border-[#332f4a] hover:border-slate-500'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g., Japan Trip, Apartment, Holidays…"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#c4b5fd]"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-xs sm:text-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Create</span>
                  </button>
                </div>
              </form>

              {/* Existing Accounts List */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Your Accounts ({settings.accounts.length})
                </span>
                {settings.accounts.map((acc) => {
                  const stats = balanceByAccount.get(acc.id);
                  const isEditing = editingId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className="p-3 rounded-2xl bg-[#151320] border border-[#332f4a] flex items-center justify-between gap-2"
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-2 flex-1">
                          <select
                            value={editEmoji}
                            onChange={(e) => setEditEmoji(e.target.value)}
                            className="px-2 py-1.5 rounded-lg bg-[#1e1b2b] border border-[#332f4a] text-base"
                          >
                            {ACCOUNT_EMOJIS.map((em) => (
                              <option key={em} value={em}>
                                {em}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#1e1b2b] border border-[#332f4a] text-xs sm:text-sm text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveRename(acc.id)}
                            className="p-1.5 rounded-lg bg-[#a7f3d0] text-[#181622] font-bold cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            onClick={() => {
                              onSelectAccount(acc.id);
                              setIsManageOpen(false);
                            }}
                            className="flex items-center gap-2.5 flex-1 cursor-pointer"
                          >
                            <span className="text-xl">{acc.emoji}</span>
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {acc.name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {stats?.count || 0} expenses • Net:{' '}
                                {formatMoney(
                                  Math.abs(stats?.net || 0),
                                  settings.baseCurrency
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(acc.id);
                                setEditName(acc.name);
                                setEditEmoji(acc.emoji);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2a263d] cursor-pointer"
                              title="Rename account"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {settings.accounts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAccount(acc)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-[#fda4af] hover:bg-[#fda4af]/10 cursor-pointer"
                                title="Delete account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
