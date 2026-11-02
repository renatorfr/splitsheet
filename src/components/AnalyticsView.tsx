import React from 'react';
import { AppSettings, Expense } from '../types';
import { getCategoryMeta } from '../lib/constants';
import { calculateSummary, formatMoney, round2 } from '../lib/finance';

interface AnalyticsViewProps {
  expenses: Expense[];
  settings: AppSettings;
  onSelectCategoryFilter: (cat: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  expenses,
  settings,
  onSelectCategoryFilter
}) => {
  const activeExpenses = expenses.filter(
    (e) => !e.isDeleted && e.splitType !== 'settlement' && e.category !== 'Settlement'
  );

  const summary = calculateSummary(expenses);

  if (activeExpenses.length === 0) {
    return (
      <div className="rounded-3xl bg-[#1e1b2b]/80 border border-[#332f4a] p-10 text-center">
        <p className="text-sm text-slate-400">
          Add or import expenses in this account to see category breakdowns and monthly spending trends.
        </p>
      </div>
    );
  }

  const catMap = new Map<
    string,
    { total: number; count: number; userAPaid: number; userBPaid: number }
  >();

  const monthMap = new Map<
    string,
    { total: number; userAPaid: number; userBPaid: number; count: number }
  >();

  for (const exp of activeExpenses) {
    const catKey = exp.category || 'Other';
    const prevCat = catMap.get(catKey) || {
      total: 0,
      count: 0,
      userAPaid: 0,
      userBPaid: 0
    };
    prevCat.total = round2(prevCat.total + exp.baseAmount);
    prevCat.count += 1;
    if (exp.paidBy === 'userA') {
      prevCat.userAPaid = round2(prevCat.userAPaid + exp.baseAmount);
    } else {
      prevCat.userBPaid = round2(prevCat.userBPaid + exp.baseAmount);
    }
    catMap.set(catKey, prevCat);

    const monthKey = (exp.date || '').slice(0, 7) || 'Unknown';
    const prevMonth = monthMap.get(monthKey) || {
      total: 0,
      userAPaid: 0,
      userBPaid: 0,
      count: 0
    };
    prevMonth.total = round2(prevMonth.total + exp.baseAmount);
    prevMonth.count += 1;
    if (exp.paidBy === 'userA') {
      prevMonth.userAPaid = round2(prevMonth.userAPaid + exp.baseAmount);
    } else {
      prevMonth.userBPaid = round2(prevMonth.userBPaid + exp.baseAmount);
    }
    monthMap.set(monthKey, prevMonth);
  }

  const categoryRows = Array.from(catMap.entries())
    .map(([category, stats]) => ({
      category,
      ...stats,
      pct: summary.totalSpend > 0 ? (stats.total / summary.totalSpend) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  const monthRows = Array.from(monthMap.entries())
    .map(([month, stats]) => ({ month, ...stats }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);

  const maxMonthTotal = Math.max(...monthRows.map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      {/* Category Breakdown Card */}
      <div className="rounded-3xl bg-[#1e1b2b]/90 border border-[#332f4a] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Spending by Category
            </h3>
            <p className="text-xs text-slate-400">
              Tap any category to filter transactions by that category
            </p>
          </div>
          <span className="text-xs font-semibold text-[#ddd6fe] bg-[#c4b5fd]/15 border border-[#c4b5fd]/35 px-2.5 py-1 rounded-full">
            Total: {formatMoney(summary.totalSpend, settings.baseCurrency)}
          </span>
        </div>

        <div className="space-y-3.5">
          {categoryRows.map((row) => {
            const meta = getCategoryMeta(row.category);
            return (
              <button
                key={row.category}
                type="button"
                onClick={() => onSelectCategoryFilter(row.category)}
                className="w-full text-left group p-3 rounded-2xl bg-[#151320]/80 hover:bg-[#151320] border border-[#332f4a] hover:border-[#4c466e] transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-100">
                    <span className="text-base">{meta.emoji}</span>
                    <span className="group-hover:text-[#c4b5fd] transition">
                      {meta.label}
                    </span>
                    <span className="text-xs font-normal text-slate-500">
                      ({row.count} {row.count === 1 ? 'item' : 'items'})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-white">
                      {formatMoney(row.total, settings.baseCurrency)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      {row.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 rounded-full bg-[#2a263d] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(2, Math.min(100, row.pct))}%`,
                      backgroundColor: meta.barColor
                    }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>
                    {settings.userAName} paid:{' '}
                    {formatMoney(row.userAPaid, settings.baseCurrency)}
                  </span>
                  <span>
                    {settings.userBName} paid:{' '}
                    {formatMoney(row.userBPaid, settings.baseCurrency)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Spending Trend */}
      <div className="rounded-3xl bg-[#1e1b2b]/90 border border-[#332f4a] p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Monthly Spending Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Stacked comparison of how much each partner paid per month
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-[#a7f3d0]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a7f3d0]" />
              {settings.userAName}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#fbcfe8]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fbcfe8]" />
              {settings.userBName}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {monthRows.map((m) => {
            const widthPct = (m.total / maxMonthTotal) * 100;
            const aPct = m.total > 0 ? (m.userAPaid / m.total) * 100 : 50;
            const bPct = 100 - aPct;

            return (
              <div
                key={m.month}
                className="p-3 rounded-2xl bg-[#151320]/80 border border-[#332f4a]"
              >
                <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                  <span className="font-semibold text-slate-200">
                    {m.month}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({m.count} expenses)
                    </span>
                  </span>
                  <span className="font-bold text-white">
                    {formatMoney(m.total, settings.baseCurrency)}
                  </span>
                </div>

                <div
                  className="h-3 rounded-full bg-[#2a263d] overflow-hidden flex"
                  style={{ width: `${Math.max(6, widthPct)}%` }}
                >
                  <div
                    style={{ width: `${aPct}%` }}
                    className="bg-[#a7f3d0] h-full"
                    title={`${settings.userAName}: ${formatMoney(m.userAPaid, settings.baseCurrency)}`}
                  />
                  <div
                    style={{ width: `${bPct}%` }}
                    className="bg-[#fbcfe8] h-full"
                    title={`${settings.userBName}: ${formatMoney(m.userBPaid, settings.baseCurrency)}`}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                  <span className="text-[#a7f3d0]">
                    {settings.userAName}: {formatMoney(m.userAPaid, settings.baseCurrency)}
                  </span>
                  <span className="text-[#fbcfe8]">
                    {settings.userBName}: {formatMoney(m.userBPaid, settings.baseCurrency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
