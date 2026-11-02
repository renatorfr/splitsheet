import React from 'react';
import { Pencil, Trash2, ArrowRight, Sparkles, Plus } from 'lucide-react';
import { AppSettings, Expense } from '../types';
import { getCategoryMeta } from '../lib/constants';
import { computeExpenseCreditA, formatMoney, round2 } from '../lib/finance';

interface ExpenseListProps {
  expenses: Expense[];
  settings: AppSettings;
  isFiltered: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onAddFirst: () => void;
  onLoadDemo: () => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  settings,
  isFiltered,
  onEdit,
  onDelete,
  onAddFirst,
  onLoadDemo
}) => {
  const accountById = React.useMemo(
    () => new Map(settings.accounts.map((a) => [a.id, a])),
    [settings.accounts]
  );

  if (expenses.length === 0) {
    return (
      <div className="rounded-3xl bg-[#1e1b2b]/80 border border-[#332f4a] p-8 sm:p-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#c4b5fd]/15 border border-[#c4b5fd]/35 flex items-center justify-center mx-auto mb-3 text-2xl">
          {isFiltered ? '🔍' : '🧾'}
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-white">
          {isFiltered ? 'No matching expenses found' : 'No expenses in this account yet'}
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
          {isFiltered
            ? 'Try adjusting your search keywords, date range, or category filters.'
            : `Start logging shared expenses between ${settings.userAName} and ${settings.userBName}, or import a Tricount CSV into this account.`}
        </p>

        {!isFiltered && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={onAddFirst}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-xs sm:text-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add First Expense</span>
            </button>
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-slate-200 font-medium text-xs sm:text-sm border border-[#423c5e] transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#fde68a]" />
              <span>Load Sample Couple Data</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  const showAccountBadge = settings.activeAccountId === 'all' && settings.accounts.length > 1;

  return (
    <div className="space-y-2.5">
      {expenses.map((exp) => {
        const cat = getCategoryMeta(
          exp.splitType === 'settlement' ? 'Settlement' : exp.category
        );
        const payerName =
          exp.paidBy === 'userA' ? settings.userAName : settings.userBName;
        const otherName =
          exp.paidBy === 'userA' ? settings.userBName : settings.userAName;
        const creditA = computeExpenseCreditA(exp);
        const absCredit = Math.abs(creditA);
        const isForeign =
          exp.currency && exp.currency.toUpperCase() !== settings.baseCurrency.toUpperCase();

        const isSettlement = exp.splitType === 'settlement';
        const acc = accountById.get(exp.accountId || 'everyday');

        let splitLabel = '50/50 split';
        if (isSettlement) {
          splitLabel = `${payerName} → ${otherName}`;
        } else if (exp.splitType === '100-B') {
          splitLabel = `100% for ${settings.userBName}`;
        } else if (exp.splitType === '100-A') {
          splitLabel = `100% for ${settings.userAName}`;
        } else if (exp.splitType === 'custom' && exp.baseAmount > 0) {
          const pctA = Math.round((exp.userAShare / exp.baseAmount) * 100);
          splitLabel = `${pctA}% / ${100 - pctA}% split`;
        }

        return (
          <div
            key={exp.id}
            onClick={() => onEdit(exp)}
            className={`group relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border transition cursor-pointer ${
              isSettlement
                ? 'bg-[#bae6fd]/10 border-[#bae6fd]/30 hover:border-[#bae6fd]/50'
                : 'bg-[#1e1b2b]/90 border-[#332f4a] hover:border-[#4c466e] hover:bg-[#232033]'
            }`}
          >
            {/* Left: Category Emoji + Title & Metadata */}
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 border ${cat.badgeClass}`}
              >
                {cat.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm sm:text-base font-semibold text-slate-100 truncate">
                    {exp.title}
                  </h4>
                  {showAccountBadge && acc && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2a263d] text-[#ddd6fe] border border-[#3e3859] text-[10px] font-semibold shrink-0">
                      <span>{acc.emoji}</span>
                      <span>{acc.name}</span>
                    </span>
                  )}
                  {exp.dirty && (
                    <span
                      className="w-2 h-2 rounded-full bg-[#fde68a] shrink-0"
                      title="Pending sync to Google Sheet"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400 mt-0.5">
                  <span className="font-medium text-slate-300">
                    {isSettlement ? (
                      <span className="inline-flex items-center gap-1 text-[#bae6fd]">
                        {payerName} <ArrowRight className="w-3 h-3" /> {otherName}
                      </span>
                    ) : (
                      <>
                        <span
                          className={
                            exp.paidBy === 'userA'
                              ? 'text-[#a7f3d0]'
                              : 'text-[#fbcfe8]'
                          }
                        >
                          {payerName}
                        </span>{' '}
                        paid {formatMoney(exp.baseAmount, settings.baseCurrency)}
                      </>
                    )}
                  </span>

                  <span>•</span>
                  <span>{exp.date}</span>
                  <span>•</span>
                  <span className="text-slate-400">{splitLabel}</span>

                  {isForeign && (
                    <span className="px-1.5 py-0.2 rounded bg-[#2a263d] text-[#fde68a] text-[11px] font-medium">
                      {formatMoney(exp.amount, exp.currency)}
                    </span>
                  )}
                </div>

                {exp.notes && (
                  <p className="text-xs text-slate-400/80 truncate mt-1">
                    {exp.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Balance Impact + Hover Actions */}
            <div className="flex items-center gap-2.5 shrink-0 text-right">
              <div>
                {isSettlement ? (
                  <div>
                    <span className="text-xs font-medium text-[#bae6fd] block">
                      Settled
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#e0f2fe]">
                      {formatMoney(exp.baseAmount, settings.baseCurrency)}
                    </span>
                  </div>
                ) : absCredit < 0.01 ? (
                  <span className="text-xs text-slate-500">No balance change</span>
                ) : (
                  <div>
                    <span className="text-[11px] text-slate-400 block">
                      {creditA > 0
                        ? `${settings.userBName} owes`
                        : `${settings.userAName} owes`}
                    </span>
                    <span
                      className={`text-sm sm:text-base font-bold ${
                        creditA > 0 ? 'text-[#a7f3d0]' : 'text-[#fbcfe8]'
                      }`}
                    >
                      {formatMoney(round2(absCredit), settings.baseCurrency)}
                    </span>
                  </div>
                )}
              </div>

              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onEdit(exp)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#2a263d] transition cursor-pointer"
                  title="Edit expense"
                  aria-label={`Edit ${exp.title}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(exp)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#fda4af] hover:bg-[#fda4af]/15 transition cursor-pointer"
                  title="Delete expense"
                  aria-label={`Delete ${exp.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
