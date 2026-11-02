import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Calendar,
  ArrowUpDown
} from 'lucide-react';
import {
  AppSettings,
  BalanceSummary,
  DatePreset,
  ExpenseFilters,
  SortOption
} from '../types';
import { CATEGORIES, DEFAULT_FILTERS } from '../lib/constants';
import { formatMoney, hasActiveFilters } from '../lib/finance';

interface SearchFilterBarProps {
  filters: ExpenseFilters;
  settings: AppSettings;
  filteredSummary: BalanceSummary;
  totalCount: number;
  filteredCount: number;
  availableCurrencies: string[];
  onChange: (next: ExpenseFilters) => void;
}

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'last-3-months', label: 'Last 3 Months' },
  { id: 'this-year', label: 'This Year' },
  { id: 'custom', label: 'Custom Range' }
];

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  settings,
  filteredSummary,
  totalCount,
  filteredCount,
  availableCurrencies,
  onChange
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isFiltered = hasActiveFilters(filters);

  const toggleCategory = (catId: string) => {
    const exists = filters.categories.includes(catId);
    const nextCats = exists
      ? filters.categories.filter((c) => c !== catId)
      : [...filters.categories, catId];
    onChange({ ...filters, categories: nextCats });
  };

  const resetAll = () => {
    onChange({ ...DEFAULT_FILTERS });
  };

  const activeDrawerCount =
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.paidBy !== 'all' ? 1 : 0) +
    (filters.splitType !== 'all' ? 1 : 0) +
    (filters.currency !== 'all' ? 1 : 0) +
    (filters.minAmount.trim() !== '' || filters.maxAmount.trim() !== '' ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search Bar + Filter Drawer Toggle + Sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={`Search title, notes, category, ${settings.userAName}/${settings.userBName}…`}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-[#c4b5fd] transition"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#2a263d]"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition cursor-pointer ${
            showAdvanced || activeDrawerCount > 0
              ? 'bg-[#c4b5fd]/15 text-[#ddd6fe] border-[#c4b5fd]/45'
              : 'bg-[#1e1b2b] text-slate-300 border-[#332f4a] hover:bg-[#282438]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {activeDrawerCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold rounded-full bg-[#c4b5fd] text-[#181622]">
              {activeDrawerCount}
            </span>
          )}
        </button>

        <div className="relative hidden sm:block">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={filters.sortBy}
            onChange={(e) => onChange({ ...filters, sortBy: e.target.value as SortOption })}
            aria-label="Sort expenses"
            className="pl-8 pr-3 py-2.5 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-[#c4b5fd] cursor-pointer"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Quick Date Range Preset Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
        {DATE_PRESETS.map((preset) => {
          const active = filters.datePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange({ ...filters, datePreset: preset.id })}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap border transition cursor-pointer ${
                active
                  ? 'bg-[#c4b5fd] text-[#181622] border-[#ddd6fe] font-semibold'
                  : 'bg-[#1e1b2b]/90 text-slate-400 border-[#332f4a] hover:text-slate-200 hover:border-[#494369]'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Inputs if 'custom' preset is chosen */}
      {filters.datePreset === 'custom' && (
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#1e1b2b] border border-[#332f4a]">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-[#151320] border border-[#332f4a] text-xs text-slate-200 focus:outline-none focus:border-[#c4b5fd]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-[#151320] border border-[#332f4a] text-xs text-slate-200 focus:outline-none focus:border-[#c4b5fd]"
            />
          </div>
        </div>
      )}

      {/* Expandable Advanced Multi-Facet Filters */}
      {showAdvanced && (
        <div className="rounded-2xl bg-[#1e1b2b] border border-[#332f4a] p-4 space-y-4 shadow-lg">
          {/* Categories Multi-Select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Categories {filters.categories.length > 0 && `(${filters.categories.length})`}
              </span>
              {filters.categories.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, categories: [] })}
                  className="text-xs text-[#c4b5fd] hover:underline"
                >
                  Clear categories
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const selected = filters.categories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer ${
                      selected
                        ? 'bg-[#c4b5fd]/20 text-[#ddd6fe] border-[#c4b5fd]'
                        : 'bg-[#151320] text-slate-300 border-[#332f4a] hover:border-[#494369]'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid By & Split Mode & Sort (Mobile) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Who Paid
              </label>
              <div className="grid grid-cols-3 gap-1 bg-[#151320] p-1 rounded-xl border border-[#332f4a]">
                {(
                  [
                    { id: 'all', label: 'Anyone' },
                    { id: 'userA', label: settings.userAName },
                    { id: 'userB', label: settings.userBName }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...filters, paidBy: opt.id })}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium truncate transition cursor-pointer ${
                      filters.paidBy === opt.id
                        ? 'bg-[#c4b5fd] text-[#181622] font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Split Type
              </label>
              <select
                value={filters.splitType}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    splitType: e.target.value as ExpenseFilters['splitType']
                  })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#151320] border border-[#332f4a] text-xs text-slate-200 focus:outline-none focus:border-[#c4b5fd]"
              >
                <option value="all">All Types</option>
                <option value="shared">Shared Splits (50/50 & Custom)</option>
                <option value="100-owed">100% Owed by Partner</option>
                <option value="settlement">Settlements / Transfers Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Amount Range ({settings.baseCurrency})
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder="Min"
                  value={filters.minAmount}
                  onChange={(e) => onChange({ ...filters, minAmount: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#151320] border border-[#332f4a] text-xs text-slate-200 focus:outline-none focus:border-[#c4b5fd]"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Max"
                  value={filters.maxAmount}
                  onChange={(e) => onChange({ ...filters, maxAmount: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#151320] border border-[#332f4a] text-xs text-slate-200 focus:outline-none focus:border-[#c4b5fd]"
                />
              </div>
            </div>
          </div>

          {/* Currency & Mobile Sort */}
          <div className="grid grid-cols-2 gap-3 sm:hidden">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Sort Order
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  onChange({ ...filters, sortBy: e.target.value as SortOption })
                }
                className="w-full px-2.5 py-1.5 rounded-xl bg-[#151320] border border-[#332f4a] text-xs text-slate-200"
              >
                <option value="date-desc">Newest first</option>
                <option value="date-asc">Oldest first</option>
                <option value="amount-desc">Highest amount</option>
                <option value="amount-asc">Lowest amount</option>
              </select>
            </div>
            {availableCurrencies.length > 1 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Original Currency
                </label>
                <select
                  value={filters.currency}
                  onChange={(e) => onChange({ ...filters, currency: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-[#151320] border border-[#332f4a] text-xs text-slate-200"
                >
                  <option value="all">All Currencies</option>
                  {availableCurrencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Filtered Summary Banner when any filter/search is active */}
      {isFiltered && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[#c4b5fd]/15 border border-[#c4b5fd]/35 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-[#ddd6fe]">
              Showing {filteredCount} of {totalCount} items
            </span>
            <span className="text-slate-300">
              Filtered Spend:{' '}
              <strong className="text-white">
                {formatMoney(filteredSummary.totalSpend, settings.baseCurrency)}
              </strong>
            </span>
            <span className="text-slate-400 hidden sm:inline">
              ({settings.userAName} paid{' '}
              {formatMoney(filteredSummary.userAPaid, settings.baseCurrency)} •{' '}
              {settings.userBName} paid{' '}
              {formatMoney(filteredSummary.userBPaid, settings.baseCurrency)})
            </span>
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 font-semibold text-[#ddd6fe] hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      )}
    </div>
  );
};
