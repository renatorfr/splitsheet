import React from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  CloudOff,
  Cloud
} from 'lucide-react';
import { AppSettings, BalanceSummary } from '../types';
import { formatMoney, round2 } from '../lib/finance';

interface BalanceHeaderProps {
  summary: BalanceSummary;
  settings: AppSettings;
  dirtyCount: number;
  isSyncing: boolean;
  syncError: string | null;
  onAddExpense: () => void;
  onSettleUp: () => void;
  onSyncNow: () => void;
  onOpenSettings: () => void;
}

export const BalanceHeader: React.FC<BalanceHeaderProps> = ({
  summary,
  settings,
  dirtyCount,
  isSyncing,
  syncError,
  onAddExpense,
  onSettleUp,
  onSyncNow,
  onOpenSettings
}) => {
  const { netBalanceA, totalSpend, userAPaid, userBPaid, userAFairShare, userBFairShare, expenseCount } =
    summary;
  const absBalance = Math.abs(round2(netBalanceA));
  const isSettled = absBalance < 0.01;

  // netBalanceA > 0 means User B owes User A
  // netBalanceA < 0 means User A owes User B
  const debtorName = netBalanceA > 0 ? settings.userBName : settings.userAName;
  const creditorName = netBalanceA > 0 ? settings.userAName : settings.userBName;

  const isConnected = Boolean(settings.scriptUrl.trim());

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/80 border border-slate-800/90 shadow-xl p-5 sm:p-6">
      {/* Top Status Row: Sync badge + Google Sheet link */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition ${
                syncError
                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                  : dirtyCount > 0
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
              title="Click to sync with Google Sheets now"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing
                ? 'Syncing with Google Sheet…'
                : syncError
                  ? 'Sync Error (Tap to retry)'
                  : dirtyCount > 0
                    ? `${dirtyCount} unsynced — Tap to sync`
                    : 'Synced with Google Drive'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800/90 text-slate-300 border border-slate-700 hover:bg-slate-800 transition"
            >
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Local Mode • Connect Google Sheet</span>
            </button>
          )}

          {settings.sheetUrl && (
            <a
              href={settings.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 transition"
              title="Open live spreadsheet in Google Drive"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open in Google Drive</span>
              <span className="sm:hidden">Drive Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="text-xs text-slate-400">
          Viewing as{' '}
          <button
            type="button"
            onClick={onOpenSettings}
            className="font-semibold text-teal-300 hover:underline"
          >
            {settings.currentUser === 'userA' ? settings.userAName : settings.userBName}
          </button>
        </div>
      </div>

      {/* Main Net Balance Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
            Current Net Balance
          </p>
          {isSettled ? (
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  All settled up!
                </h2>
                <p className="text-xs text-slate-400">
                  Neither {settings.userAName} nor {settings.userBName} owes anything right now.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg sm:text-xl font-semibold text-slate-200">
                  {debtorName} owes {creditorName}
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-teal-400">
                  {formatMoney(absBalance, settings.baseCurrency)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Calculated across {expenseCount} shared {expenseCount === 1 ? 'expense' : 'expenses'} in{' '}
                {settings.baseCurrency}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {!isSettled && (
            <button
              type="button"
              onClick={onSettleUp}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-sm border border-slate-700 transition cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-teal-400" />
              <span>Settle Up</span>
            </button>
          )}
          <button
            type="button"
            onClick={onAddExpense}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Partner Paid vs Fair Share Mini Cards */}
      <div className="grid grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-slate-800/80 text-xs">
        <div className="rounded-xl bg-slate-950/50 border border-slate-800/70 p-2.5">
          <span className="text-slate-400 block">Total Shared Spend</span>
          <span className="text-sm sm:text-base font-bold text-white mt-0.5 block">
            {formatMoney(totalSpend, settings.baseCurrency)}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/50 border border-slate-800/70 p-2.5">
          <span className="text-slate-400 block truncate">{settings.userAName} Paid</span>
          <span className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5 block">
            {formatMoney(userAPaid, settings.baseCurrency)}
          </span>
          <span className="text-[11px] text-slate-500 block">
            Share: {formatMoney(userAFairShare, settings.baseCurrency)}
          </span>
        </div>

        <div className="rounded-xl bg-slate-950/50 border border-slate-800/70 p-2.5">
          <span className="text-slate-400 block truncate">{settings.userBName} Paid</span>
          <span className="text-sm sm:text-base font-bold text-indigo-400 mt-0.5 block">
            {formatMoney(userBPaid, settings.baseCurrency)}
          </span>
          <span className="text-[11px] text-slate-500 block">
            Share: {formatMoney(userBFairShare, settings.baseCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
};
