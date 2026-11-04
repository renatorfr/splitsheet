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
  activeAccountLabel: string;
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
  activeAccountLabel,
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

  const debtorName = netBalanceA > 0 ? settings.userBName : settings.userAName;
  const creditorName = netBalanceA > 0 ? settings.userAName : settings.userBName;

  const isConnected = Boolean(settings.scriptUrl.trim());

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b2b] via-[#221e33] to-[#2b2442] border border-[#363152] shadow-xl p-5 sm:p-6">
      {/* Top Status Row: Sync badge + Google Sheet link */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {isConnected ? (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition cursor-pointer ${
                syncError
                  ? 'bg-[#fecdd3]/15 text-[#fecdd3] border-[#fecdd3]/35 hover:bg-[#fecdd3]/25'
                  : dirtyCount > 0
                    ? 'bg-[#fde68a]/15 text-[#fde68a] border-[#fde68a]/35 hover:bg-[#fde68a]/25'
                    : 'bg-[#a7f3d0]/15 text-[#a7f3d0] border-[#a7f3d0]/35 hover:bg-[#a7f3d0]/25'
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
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#151320]/90 text-slate-300 border border-[#363152] hover:bg-[#282438] transition cursor-pointer"
            >
              <CloudOff className="w-3.5 h-3.5 text-[#fde68a]" />
              <span>Local Mode • Connect Google Sheet</span>
            </button>
          )}

          {settings.sheetUrl && (
            <a
              href={settings.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#c4b5fd]/15 text-[#ddd6fe] border border-[#c4b5fd]/35 hover:bg-[#c4b5fd]/25 transition"
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
            className="font-semibold text-[#c4b5fd] hover:underline cursor-pointer"
          >
            {settings.currentUser === 'userA' ? settings.userAName : settings.userBName}
          </button>
        </div>
      </div>

      {/* Main Net Balance Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-[#c4b5fd]/85 mb-1">
            {activeAccountLabel} — Net Balance
          </p>
          {isSettled ? (
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-8 h-8 text-[#a7f3d0] shrink-0" />
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  All settled up!
                </h2>
                <p className="text-xs text-slate-400">
                  Neither {settings.userAName} nor {settings.userBName} owes anything in this account.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg sm:text-xl font-semibold text-slate-200">
                  {debtorName} owes {creditorName}
                </span>
                <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#c4b5fd]">
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
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-slate-100 font-medium text-sm border border-[#423c5e] transition cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-[#bae6fd]" />
              <span>Settle Up</span>
            </button>
          )}
          <button
            type="button"
            onClick={onAddExpense}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-sm shadow-lg shadow-[#c4b5fd]/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Partner Paid vs Fair Share Mini Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-5 pt-4 border-t border-[#363152]/80 text-xs">
        <div className="min-w-0 rounded-xl bg-[#151320]/65 border border-[#332f4a] p-2 sm:p-2.5">
          <span className="text-slate-400 block truncate">Total Spend</span>
          <span className="text-sm sm:text-base font-bold text-white mt-0.5 block truncate">
            {formatMoney(totalSpend, settings.baseCurrency)}
          </span>
        </div>

        <div className="min-w-0 rounded-xl bg-[#151320]/65 border border-[#332f4a] p-2 sm:p-2.5">
          <span className="text-slate-400 block truncate">{settings.userAName} Paid</span>
          <span className="text-sm sm:text-base font-bold text-[#a7f3d0] mt-0.5 block truncate">
            {formatMoney(userAPaid, settings.baseCurrency)}
          </span>
          <span className="text-[11px] text-slate-400 block truncate">
            Share: {formatMoney(userAFairShare, settings.baseCurrency)}
          </span>
        </div>

        <div className="min-w-0 rounded-xl bg-[#151320]/65 border border-[#332f4a] p-2 sm:p-2.5">
          <span className="text-slate-400 block truncate">{settings.userBName} Paid</span>
          <span className="text-sm sm:text-base font-bold text-[#fbcfe8] mt-0.5 block truncate">
            {formatMoney(userBPaid, settings.baseCurrency)}
          </span>
          <span className="text-[11px] text-slate-400 block truncate">
            Share: {formatMoney(userBFairShare, settings.baseCurrency)}
          </span>
        </div>
      </div>
    </div>
  );
};
