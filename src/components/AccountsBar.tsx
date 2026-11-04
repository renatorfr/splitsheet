import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  FolderPlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { AccountGroup, AppSettings, Expense } from '../types';
import { ACCOUNT_EMOJIS } from '../lib/constants';
import { calculateSummary, formatMoney, generateId, round2 } from '../lib/finance';

interface AccountsBarProps {
  settings: AppSettings;
  expenses: Expense[];
  onSelectAccount: (accountId: string) => void;
  onCreateAccount: (account: AccountGroup) => void;
  onEditAccount: (updated: AccountGroup) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AccountsBar: React.FC<AccountsBarProps> = ({
  settings,
  expenses,
  onSelectAccount,
  onCreateAccount,
  onEditAccount,
  onDeleteAccount
}) => {
  const [isManageOpen, setIsManageOpen] = useState(false);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('✈️');

  // Edit form state (when editing any account, including the initial one)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🏠');

  // Delete confirmation state (in-app warning, never blocks delete)
  const [confirmDeleteAccount, setConfirmDeleteAccount] =
    useState<AccountGroup | null>(null);

  const editingAccount = React.useMemo(
    () =>
      editingId ? settings.accounts.find((a) => a.id === editingId) || null : null,
    [editingId, settings.accounts]
  );

  // Compute per-account mini net balances and expense counts
  const statsByAccount = React.useMemo(() => {
    const map = new Map<string, { net: number; count: number; totalSpend: number }>();
    const defaultAccId = settings.accounts[0]?.id || '';
    for (const acc of settings.accounts) {
      map.set(acc.id, { net: 0, count: 0, totalSpend: 0 });
    }
    for (const exp of expenses) {
      if (exp.isDeleted) continue;
      const accId = exp.accountId || defaultAccId;
      const sub = calculateSummary([exp]);
      const prev = map.get(accId) || { net: 0, count: 0, totalSpend: 0 };
      prev.net = round2(prev.net + sub.netBalanceA);
      prev.totalSpend = round2(prev.totalSpend + sub.totalSpend);
      prev.count += 1;
      map.set(accId, prev);
    }
    return map;
  }, [expenses, settings.accounts]);

  const activeAccountObj = React.useMemo(
    () =>
      settings.activeAccountId !== 'all'
        ? settings.accounts.find((a) => a.id === settings.activeAccountId) || null
        : null,
    [settings.accounts, settings.activeAccountId]
  );

  const openEditForAccount = (acc: AccountGroup) => {
    setConfirmDeleteAccount(null);
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditEmoji(acc.emoji || '🏠');
    setIsManageOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
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

    const now = Date.now();
    const created: AccountGroup = {
      id: uniqueId,
      name: trimmed,
      emoji: newEmoji.trim() || '📁',
      createdAt: now,
      updatedAt: now
    };

    onCreateAccount(created);
    setNewName('');
    setNewEmoji('🏖️');
    setIsManageOpen(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const trimmed = editName.trim();
    if (!trimmed) return;

    const updated: AccountGroup = {
      ...editingAccount,
      name: trimmed,
      emoji: editEmoji.trim() || '🏠',
      updatedAt: Date.now()
    };

    onEditAccount(updated);
    setEditingId(null);
    setIsManageOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteAccount) return;
    const targetId = confirmDeleteAccount.id;
    onDeleteAccount(targetId);
    setConfirmDeleteAccount(null);
    if (editingId === targetId) {
      setEditingId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Scrollable Account Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar flex-1 min-w-0">
          {settings.accounts.map((acc) => {
            const active = settings.activeAccountId === acc.id;
            const stats = statsByAccount.get(acc.id);
            const absNet = Math.abs(round2(stats?.net || 0));

            return (
              <div
                key={acc.id}
                className={`inline-flex items-center rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap border transition ${
                  active
                    ? 'bg-[#c4b5fd] text-[#181622] border-[#ddd6fe] shadow-md shadow-[#c4b5fd]/15'
                    : 'bg-[#1e1b2b]/90 text-slate-300 border-[#332f4a] hover:border-[#c4b5fd]/50 hover:text-white'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (active) {
                      // Tapping an already-active group pill opens Edit directly!
                      openEditForAccount(acc);
                    } else {
                      onSelectAccount(acc.id);
                    }
                  }}
                  className="inline-flex items-center gap-2 pl-3.5 pr-2 py-2 cursor-pointer"
                  title={
                    active
                      ? `Tap to edit or delete "${acc.name}"`
                      : `Switch to "${acc.name}"`
                  }
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

                {/* Inline Edit Icon right inside every pill */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditForAccount(acc);
                  }}
                  className={`pr-2.5 pl-1 py-2 rounded-r-2xl transition cursor-pointer ${
                    active
                      ? 'text-[#181622]/70 hover:text-[#181622]'
                      : 'text-slate-400 hover:text-[#c4b5fd]'
                  }`}
                  title={`Edit or delete "${acc.name}"`}
                  aria-label={`Edit ${acc.name}`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
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
              <span>All Groups</span>
            </button>
          )}
        </div>

        {/* Right Action Buttons: Edit Active Group + Add/Manage Groups */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeAccountObj && (
            <button
              type="button"
              onClick={() => openEditForAccount(activeAccountObj)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-2xl bg-[#1e1b2b] hover:bg-[#282438] text-slate-300 hover:text-white border border-[#332f4a] text-xs font-semibold transition cursor-pointer"
              title={`Edit or delete "${activeAccountObj.name}"`}
            >
              <Pencil className="w-3.5 h-3.5 text-[#c4b5fd]" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setConfirmDeleteAccount(null);
              setIsManageOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#1e1b2b] hover:bg-[#282438] text-[#ddd6fe] border border-[#332f4a] text-xs font-semibold transition cursor-pointer"
            title="Add, edit, or delete expense groups"
          >
            <FolderPlus className="w-4 h-4 text-[#c4b5fd]" />
            <span>{settings.accounts.length === 0 ? '+ New Group' : 'Groups'}</span>
          </button>
        </div>
      </div>

      {/* Modal to Create, Edit (Rename & Change Icon), and Delete Accounts */}
      {isManageOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f0d16]/80 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1e1b2b] border border-[#332f4a] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#1e1b2b]/95 backdrop-blur border-b border-[#332f4a]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {editingAccount
                    ? `Edit Group "${editingAccount.name}"`
                    : 'Manage Expense Groups'}
                </h3>
                <p className="text-xs text-slate-400">
                  Rename, change icons, or delete any group — synced to your single Google Sheet
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsManageOpen(false);
                  setEditingId(null);
                  setConfirmDeleteAccount(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2a263d] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Delete Confirmation Warning Banner (Never blocks deletion) */}
              {confirmDeleteAccount && (
                <div className="p-4 rounded-2xl bg-[#fda4af]/15 border border-[#fda4af]/40 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#fda4af] shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-slate-200 space-y-1">
                      <p className="font-bold text-[#fecdd3]">
                        Delete &ldquo;{confirmDeleteAccount.emoji}{' '}
                        {confirmDeleteAccount.name}&rdquo;?
                      </p>
                      {(statsByAccount.get(confirmDeleteAccount.id)?.count || 0) > 0 ? (
                        <p className="text-slate-300 leading-relaxed">
                          Warning: This group currently has{' '}
                          <strong className="text-[#fde68a]">
                            {statsByAccount.get(confirmDeleteAccount.id)?.count}{' '}
                            {statsByAccount.get(confirmDeleteAccount.id)?.count === 1
                              ? 'expense'
                              : 'expenses'}
                          </strong>{' '}
                          (Total spend:{' '}
                          <strong>
                            {formatMoney(
                              statsByAccount.get(confirmDeleteAccount.id)?.totalSpend || 0,
                              settings.baseCurrency
                            )}
                          </strong>
                          ). Deleting this group will also delete its expenses.
                        </p>
                      ) : (
                        <p className="text-slate-300">
                          This group has no expenses. Are you sure you want to delete it?
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(null)}
                      className="px-3.5 py-2 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-slate-200 text-xs font-semibold transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#fda4af] hover:bg-[#fecdd3] text-[#181622] text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>
                        {(statsByAccount.get(confirmDeleteAccount.id)?.count || 0) > 0
                          ? 'Delete Group & Expenses'
                          : 'Confirm Delete'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* EDIT EXISTING ACCOUNT FORM */}
              {editingAccount ? (
                <form
                  onSubmit={handleEditSubmit}
                  className="p-4 rounded-2xl bg-[#151320] border border-[#c4b5fd]/40 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#c4b5fd]">
                      Rename &amp; Change Icon
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      + Create new group instead
                    </button>
                  </div>

                  {/* Emoji Grid + Custom Emoji Input */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">
                      Choose Group Icon (or type any emoji)
                    </label>
                    <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 mb-2.5">
                      {ACCOUNT_EMOJIS.map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setEditEmoji(em)}
                          className={`h-9 rounded-xl flex items-center justify-center text-lg border transition cursor-pointer ${
                            editEmoji === em
                              ? 'bg-[#c4b5fd]/30 border-[#c4b5fd] scale-105'
                              : 'bg-[#1e1b2b] border-[#332f4a] hover:border-slate-500'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon + Name Input Row */}
                  <div className="grid grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Icon
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editEmoji}
                        onChange={(e) => setEditEmoji(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-center text-lg text-white focus:outline-none focus:border-[#c4b5fd]"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Group / Account Name
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Group name…"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm font-semibold text-white focus:outline-none focus:border-[#c4b5fd]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#332f4a]">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(editingAccount)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#fda4af]/15 hover:bg-[#fda4af]/25 text-[#fda4af] border border-[#fda4af]/30 text-xs font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Group</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3.5 py-2 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-slate-300 text-xs font-semibold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-xs sm:text-sm transition cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                /* CREATE NEW ACCOUNT FORM */
                <form
                  onSubmit={handleCreateSubmit}
                  className="p-4 rounded-2xl bg-[#151320] border border-[#332f4a] space-y-3"
                >
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#c4b5fd]">
                    Create New Group / Account
                  </label>

                  <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
                    {ACCOUNT_EMOJIS.slice(0, 20).map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewEmoji(em)}
                        className={`h-8 rounded-xl flex items-center justify-center text-base border transition cursor-pointer ${
                          newEmoji === em
                            ? 'bg-[#c4b5fd]/25 border-[#c4b5fd]'
                            : 'bg-[#1e1b2b] border-[#332f4a] hover:border-slate-500'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 min-w-0">
                    <input
                      type="text"
                      maxLength={4}
                      value={newEmoji}
                      onChange={(e) => setNewEmoji(e.target.value)}
                      className="w-12 shrink-0 px-2 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-center text-base text-white focus:outline-none focus:border-[#c4b5fd]"
                      title="Custom emoji"
                    />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Japan Trip, Apartment, Holidays…"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#c4b5fd]"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-xs sm:text-sm transition cursor-pointer shrink-0"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>Create</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Accounts List */}
              <div className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Your Groups ({settings.accounts.length})
                </span>
                {settings.accounts.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-[#151320] border border-[#332f4a] text-center text-xs text-slate-400">
                    No groups yet. Create your first group above!
                  </div>
                ) : (
                  settings.accounts.map((acc) => {
                    const stats = statsByAccount.get(acc.id);
                    const isCurrentlyEditing = editingId === acc.id;

                    return (
                      <div
                        key={acc.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition ${
                          isCurrentlyEditing
                            ? 'bg-[#c4b5fd]/10 border-[#c4b5fd]'
                            : 'bg-[#151320] border-[#332f4a]'
                        }`}
                      >
                        <div
                          onClick={() => {
                            onSelectAccount(acc.id);
                            setIsManageOpen(false);
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="w-10 h-10 rounded-xl bg-[#1e1b2b] border border-[#332f4a] flex items-center justify-center text-xl shrink-0">
                            {acc.emoji}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {acc.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {stats?.count || 0}{' '}
                              {stats?.count === 1 ? 'expense' : 'expenses'} • Net:{' '}
                              {formatMoney(
                                Math.abs(stats?.net || 0),
                                settings.baseCurrency
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditForAccount(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#1e1b2b] hover:bg-[#2a263d] text-[#ddd6fe] border border-[#332f4a] text-xs font-medium cursor-pointer"
                            title="Edit name & icon"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteAccount(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#fda4af]/10 hover:bg-[#fda4af]/20 text-[#fda4af] border border-[#fda4af]/25 text-xs font-medium cursor-pointer"
                            title="Delete group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
