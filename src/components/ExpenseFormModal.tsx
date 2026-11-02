import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Check, ArrowRightLeft } from 'lucide-react';
import { AppSettings, Expense, PartnerId, SplitType } from '../types';
import { CATEGORIES, CURRENCIES } from '../lib/constants';
import {
  computeUserAShare,
  fetchExchangeRate,
  formatMoney,
  generateId,
  round2
} from '../lib/finance';

interface ExpenseFormModalProps {
  isOpen: boolean;
  editingExpense: Expense | null;
  presetSettlement?: {
    paidBy: PartnerId;
    amount: number;
  } | null;
  settings: AppSettings;
  onClose: () => void;
  onSave: (expense: Expense) => void;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  editingExpense,
  presetSettlement,
  settings,
  onClose,
  onSave
}) => {
  const today = new Date().toISOString().slice(0, 10);

  const defaultAccountId =
    settings.activeAccountId !== 'all'
      ? settings.activeAccountId
      : settings.accounts[0]?.id || 'everyday';

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState(settings.baseCurrency);
  const [exchangeRateStr, setExchangeRateStr] = useState('1');
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [date, setDate] = useState(today);
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [paidBy, setPaidBy] = useState<PartnerId>(settings.currentUser);
  const [splitType, setSplitType] = useState<SplitType>('50-50');
  const [customMode, setCustomMode] = useState<'percent' | 'exact'>('percent');
  const [customPercentA, setCustomPercentA] = useState<string>(
    String(settings.defaultSplitA || 50)
  );
  const [customExactA, setCustomExactA] = useState<string>('');
  const [category, setCategory] = useState<string>('Groceries');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmountStr(String(editingExpense.amount));
      setCurrency(editingExpense.currency || settings.baseCurrency);
      setExchangeRateStr(String(editingExpense.exchangeRate || 1));
      setDate(editingExpense.date || today);
      setAccountId(editingExpense.accountId || defaultAccountId);
      setPaidBy(editingExpense.paidBy);
      setSplitType(editingExpense.splitType);
      setCategory(editingExpense.category || 'Other');
      setNotes(editingExpense.notes || '');
      const base = editingExpense.baseAmount || editingExpense.amount || 0;
      const pct = base > 0 ? Math.round((editingExpense.userAShare / base) * 100) : 50;
      setCustomPercentA(String(pct));
      setCustomExactA(String(editingExpense.userAShare));
    } else if (presetSettlement) {
      setTitle('Settlement / Reimbursement');
      setAmountStr(String(round2(presetSettlement.amount)));
      setCurrency(settings.baseCurrency);
      setExchangeRateStr('1');
      setDate(today);
      setAccountId(defaultAccountId);
      setPaidBy(presetSettlement.paidBy);
      setSplitType('settlement');
      setCategory('Settlement');
      setNotes('Balance settlement');
    } else {
      setTitle('');
      setAmountStr('');
      setCurrency(settings.baseCurrency);
      setExchangeRateStr('1');
      setDate(today);
      setAccountId(defaultAccountId);
      setPaidBy(settings.currentUser);
      setSplitType('50-50');
      setCustomPercentA(String(settings.defaultSplitA || 50));
      setCustomExactA('');
      setCategory('Groceries');
      setNotes('');
    }
  }, [isOpen, editingExpense, presetSettlement, settings, defaultAccountId]);

  useEffect(() => {
    if (!isOpen) return;
    if (currency.toUpperCase() === settings.baseCurrency.toUpperCase()) {
      setExchangeRateStr('1');
      return;
    }
    if (
      editingExpense &&
      editingExpense.currency === currency &&
      editingExpense.date === date
    ) {
      return;
    }

    let cancelled = false;
    setIsLoadingRate(true);
    fetchExchangeRate(currency, settings.baseCurrency, date).then((rate) => {
      if (cancelled) return;
      setIsLoadingRate(false);
      if (rate !== null) {
        setExchangeRateStr(String(Number(rate.toFixed(5))));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currency, date, settings.baseCurrency, isOpen, editingExpense]);

  if (!isOpen) return null;

  const parsedAmount = Math.max(0, parseFloat(amountStr.replace(',', '.')) || 0);
  const parsedRate = Math.max(0.00001, parseFloat(exchangeRateStr.replace(',', '.')) || 1);
  const isForeign = currency.toUpperCase() !== settings.baseCurrency.toUpperCase();
  const baseAmount = isForeign ? round2(parsedAmount * parsedRate) : round2(parsedAmount);

  let customShareVal = round2(baseAmount / 2);
  if (splitType === 'custom') {
    if (customMode === 'percent') {
      const pct = Math.min(100, Math.max(0, parseFloat(customPercentA) || 0));
      customShareVal = round2((baseAmount * pct) / 100);
    } else {
      customShareVal = Math.min(
        baseAmount,
        Math.max(0, parseFloat(customExactA.replace(',', '.')) || 0)
      );
    }
  }

  const userAShare = computeUserAShare(
    baseAmount,
    splitType,
    paidBy,
    customShareVal,
    settings.defaultSplitA
  );
  const userBShare = round2(baseAmount - userAShare);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) return;

    const finalTitle =
      title.trim() ||
      (splitType === 'settlement' ? 'Settlement Transfer' : category);

    const selectedAccount =
      settings.accounts.find((a) => a.id === accountId) || settings.accounts[0];

    const expense: Expense = {
      id: editingExpense ? editingExpense.id : generateId(),
      date: date || today,
      title: finalTitle,
      amount: round2(parsedAmount),
      currency: currency.toUpperCase(),
      exchangeRate: isForeign ? parsedRate : 1,
      baseAmount,
      paidBy,
      splitType,
      userAShare,
      category: splitType === 'settlement' ? 'Settlement' : category,
      notes: notes.trim(),
      isDeleted: false,
      updatedAt: Date.now(),
      accountId: selectedAccount?.id || 'everyday',
      accountName: selectedAccount?.name || 'Everyday',
      dirty: true
    };

    onSave(expense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f0d16]/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1e1b2b] border border-[#332f4a] shadow-2xl">
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#1e1b2b]/95 backdrop-blur border-b border-[#332f4a]">
          <h3 className="text-base sm:text-lg font-bold text-white">
            {editingExpense
              ? 'Edit Expense'
              : splitType === 'settlement'
                ? 'Settle Up Balance'
                : 'New Shared Expense'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2a263d] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Account / Group Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Account / Group
            </label>
            <div className="flex flex-wrap gap-1.5">
              {settings.accounts.map((acc) => {
                const active = accountId === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccountId(acc.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      active
                        ? 'bg-[#c4b5fd]/20 text-[#ddd6fe] border-[#c4b5fd]'
                        : 'bg-[#151320] text-slate-400 border-[#332f4a] hover:text-slate-200'
                    }`}
                  >
                    <span>{acc.emoji}</span>
                    <span>{acc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount + Currency Row */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Amount
              </label>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151320] border border-[#332f4a] text-xl font-bold text-white focus:outline-none focus:border-[#c4b5fd]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-3 rounded-xl bg-[#151320] border border-[#332f4a] text-sm font-semibold text-slate-100 focus:outline-none focus:border-[#c4b5fd]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Currency Conversion Banner (if foreign currency selected) */}
          {isForeign && (
            <div className="p-3.5 rounded-2xl bg-[#fde68a]/10 border border-[#fde68a]/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#fde68a]">
                  Currency Conversion ({currency} → {settings.baseCurrency})
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoadingRate(true);
                    const r = await fetchExchangeRate(
                      currency,
                      settings.baseCurrency,
                      date
                    );
                    setIsLoadingRate(false);
                    if (r !== null) setExchangeRateStr(String(Number(r.toFixed(5))));
                  }}
                  className="inline-flex items-center gap-1 text-[#fde68a] hover:underline"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${isLoadingRate ? 'animate-spin' : ''}`}
                  />
                  <span>Fetch ECB Rate</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 items-center">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Exchange Rate (1 {currency} =)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={exchangeRateStr}
                    onChange={(e) => setExchangeRateStr(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#151320] border border-[#332f4a] text-xs text-white"
                  />
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">
                    Converted in {settings.baseCurrency}
                  </span>
                  <span className="text-base font-bold text-[#fde68a]">
                    {formatMoney(baseAmount, settings.baseCurrency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Description & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                What was it for?
              </label>
              <input
                type="text"
                placeholder="e.g., Weekly groceries, Sushi dinner, Electricity bill"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#151320] border border-[#332f4a] text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#c4b5fd]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#151320] border border-[#332f4a] text-sm text-white focus:outline-none focus:border-[#c4b5fd]"
              />
            </div>
          </div>

          {/* Who Paid Toggle */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {splitType === 'settlement' ? 'Who sent the money?' : 'Who paid?'}
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'userA', name: settings.userAName },
                  { id: 'userB', name: settings.userBName }
                ] as const
              ).map((p) => {
                const selected = paidBy === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaidBy(p.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                      selected
                        ? 'bg-[#c4b5fd]/20 border-[#c4b5fd] text-[#ddd6fe] shadow-sm'
                        : 'bg-[#151320] border-[#332f4a] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {selected && <Check className="w-4 h-4 text-[#c4b5fd]" />}
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              How should this be split?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSplitType('50-50')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  splitType === '50-50'
                    ? 'bg-[#c4b5fd]/20 border-[#c4b5fd] text-white'
                    : 'bg-[#151320] border-[#332f4a] text-slate-400 hover:border-[#494369]'
                }`}
              >
                <div className="text-xs font-bold">
                  {settings.defaultSplitA === 50
                    ? '50 / 50 Equal'
                    : `${settings.defaultSplitA}% / ${100 - settings.defaultSplitA}% Default`}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Shared expense
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSplitType('100-B')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  splitType === '100-B'
                    ? 'bg-[#c4b5fd]/20 border-[#c4b5fd] text-white'
                    : 'bg-[#151320] border-[#332f4a] text-slate-400 hover:border-[#494369]'
                }`}
              >
                <div className="text-xs font-bold truncate">
                  100% for {settings.userBName}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {settings.userBName} owes full
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSplitType('100-A')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  splitType === '100-A'
                    ? 'bg-[#c4b5fd]/20 border-[#c4b5fd] text-white'
                    : 'bg-[#151320] border-[#332f4a] text-slate-400 hover:border-[#494369]'
                }`}
              >
                <div className="text-xs font-bold truncate">
                  100% for {settings.userAName}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {settings.userAName} owes full
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSplitType('custom')}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  splitType === 'custom'
                    ? 'bg-[#c4b5fd]/20 border-[#c4b5fd] text-white'
                    : 'bg-[#151320] border-[#332f4a] text-slate-400 hover:border-[#494369]'
                }`}
              >
                <div className="text-xs font-bold">Custom Split</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  By % or exact amount
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitType('settlement');
                  setCategory('Settlement');
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer col-span-2 sm:col-span-2 ${
                  splitType === 'settlement'
                    ? 'bg-[#bae6fd]/20 border-[#bae6fd] text-white'
                    : 'bg-[#151320] border-[#332f4a] text-slate-400 hover:border-[#494369]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#bae6fd]" />
                  <span>Settlement / Direct Payback</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {paidBy === 'userA'
                    ? `${settings.userAName} paid ${settings.userBName} directly`
                    : `${settings.userBName} paid ${settings.userAName} directly`}
                </div>
              </button>
            </div>
          </div>

          {/* Custom Split Controls */}
          {splitType === 'custom' && (
            <div className="p-3.5 rounded-2xl bg-[#151320] border border-[#332f4a] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Custom Split Configuration
                </span>
                <div className="inline-flex rounded-lg bg-[#1e1b2b] p-0.5 border border-[#332f4a] text-xs">
                  <button
                    type="button"
                    onClick={() => setCustomMode('percent')}
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      customMode === 'percent'
                        ? 'bg-[#c4b5fd] text-[#181622] font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    By %
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMode('exact');
                      setCustomExactA(String(userAShare));
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium ${
                      customMode === 'exact'
                        ? 'bg-[#c4b5fd] text-[#181622] font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    Exact {settings.baseCurrency}
                  </button>
                </div>
              </div>

              {customMode === 'percent' ? (
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={customPercentA}
                    onChange={(e) => setCustomPercentA(e.target.value)}
                    className="w-full accent-[#c4b5fd]"
                  />
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>
                      {settings.userAName}: <strong>{customPercentA}%</strong> (
                      {formatMoney(userAShare, settings.baseCurrency)})
                    </span>
                    <span>
                      {settings.userBName}:{' '}
                      <strong>{100 - (Number(customPercentA) || 0)}%</strong> (
                      {formatMoney(userBShare, settings.baseCurrency)})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {settings.userAName}&apos;s Share ({settings.baseCurrency})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={customExactA}
                      onChange={(e) => setCustomExactA(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#1e1b2b] border border-[#332f4a] text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {settings.userBName}&apos;s Remaining Share
                    </label>
                    <div className="px-3 py-1.5 rounded-lg bg-[#1e1b2b]/50 border border-[#332f4a] text-xs text-slate-300">
                      {formatMoney(userBShare, settings.baseCurrency)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Share Preview Pill */}
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#151320] border border-[#332f4a] text-xs text-slate-300">
            <span>
              {settings.userAName}&apos;s share:{' '}
              <strong className="text-[#a7f3d0]">
                {formatMoney(userAShare, settings.baseCurrency)}
              </strong>
            </span>
            <span>
              {settings.userBName}&apos;s share:{' '}
              <strong className="text-[#fbcfe8]">
                {formatMoney(userBShare, settings.baseCurrency)}
              </strong>
            </span>
          </div>

          {/* Category Picker (hidden for settlements) */}
          {splitType !== 'settlement' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {CATEGORIES.filter((c) => c.id !== 'Settlement').map((cat) => {
                  const active = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition cursor-pointer ${
                        active
                          ? 'bg-[#c4b5fd]/20 border-[#c4b5fd] text-white font-semibold'
                          : 'bg-[#151320] border-[#332f4a] text-slate-400 hover:border-[#494369]'
                      }`}
                    >
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-[11px] truncate max-w-full mt-0.5">
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="Any extra details, trip tag, or receipt note…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#151320] border border-[#332f4a] text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#c4b5fd]"
            />
          </div>

          {/* Submit & Cancel */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-slate-300 text-sm font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-sm shadow-lg shadow-[#c4b5fd]/20 transition cursor-pointer"
            >
              {editingExpense ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
