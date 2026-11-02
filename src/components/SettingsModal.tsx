import React, { useState } from 'react';
import {
  X,
  Check,
  RefreshCw,
  Share2,
  Settings,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { AppSettings, PartnerId } from '../types';
import { CURRENCIES } from '../lib/constants';
import { createPartnerInviteUrl } from '../lib/storage';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  isSyncing: boolean;
  syncError: string | null;
  onClose: () => void;
  onSaveSettings: (next: AppSettings, triggerSync?: boolean) => void;
  onClearAllLocal: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  isSyncing,
  syncError,
  onClose,
  onSaveSettings,
  onClearAllLocal
}) => {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(
      { ...form, accounts: settings.accounts, activeAccountId: settings.activeAccountId },
      Boolean(form.scriptUrl.trim())
    );
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  const handleCopyPartnerLink = () => {
    const targetPartner: PartnerId =
      form.currentUser === 'userA' ? 'userB' : 'userA';
    const url = createPartnerInviteUrl(
      { ...form, accounts: settings.accounts, activeAccountId: settings.activeAccountId },
      targetPartner
    );
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const partnerTargetName =
    form.currentUser === 'userA' ? form.userBName : form.userAName;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f0d16]/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1e1b2b] border border-[#332f4a] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#1e1b2b]/95 backdrop-blur border-b border-[#332f4a]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#c4b5fd]" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Couple & Google Sheet Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#2a263d] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-5">
          {/* Couple Profile Section */}
          <div className="p-4 rounded-2xl bg-[#151320] border border-[#332f4a] space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#c4b5fd]">
              1. Couple Names & Currency
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Partner A Name
                </label>
                <input
                  type="text"
                  required
                  value={form.userAName}
                  onChange={(e) => setForm({ ...form, userAName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm text-white focus:outline-none focus:border-[#c4b5fd]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Partner B Name
                </label>
                <input
                  type="text"
                  required
                  value={form.userBName}
                  onChange={(e) => setForm({ ...form, userBName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm text-white focus:outline-none focus:border-[#c4b5fd]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Who is using this phone?
                </label>
                <select
                  value={form.currentUser}
                  onChange={(e) =>
                    setForm({ ...form, currentUser: e.target.value as PartnerId })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm text-white focus:outline-none focus:border-[#c4b5fd]"
                >
                  <option value="userA">{form.userAName}</option>
                  <option value="userB">{form.userBName}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Base Currency
                </label>
                <select
                  value={form.baseCurrency}
                  onChange={(e) =>
                    setForm({ ...form, baseCurrency: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-sm text-white focus:outline-none focus:border-[#c4b5fd]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Default Shared Split Ratio</span>
                <span className="font-semibold text-slate-200">
                  {form.userAName} {form.defaultSplitA}% / {form.userBName}{' '}
                  {100 - form.defaultSplitA}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.defaultSplitA}
                onChange={(e) =>
                  setForm({ ...form, defaultSplitA: Number(e.target.value) })
                }
                className="w-full accent-[#c4b5fd]"
              />
            </div>
          </div>

          {/* Google Sheet Backend Connection */}
          <div className="p-4 rounded-2xl bg-[#151320] border border-[#332f4a] space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#c4b5fd]">
                2. Live Google Sheet in Google Drive
              </h4>
              {form.sheetUrl && (
                <a
                  href={form.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#c4b5fd] hover:underline"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Paste your deployed Google Apps Script Web App URL (<code className="text-slate-300">https://script.google.com/macros/s/.../exec</code>) and your shared Secret Key from <code className="text-slate-300">google-apps-script/Code.gs</code>.
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={form.scriptUrl}
                onChange={(e) => setForm({ ...form, scriptUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-[#c4b5fd]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Secret Key (from Code.gs)
                </label>
                <input
                  type="password"
                  placeholder="change-me-secret-key"
                  value={form.secretKey}
                  onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-[#c4b5fd]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Google Sheet URL (Auto-filled on sync)
                </label>
                <input
                  type="url"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={form.sheetUrl}
                  onChange={(e) => setForm({ ...form, sheetUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#1e1b2b] border border-[#332f4a] text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-[#c4b5fd]"
                />
              </div>
            </div>

            {syncError && (
              <div className="p-2.5 rounded-xl bg-[#fecdd3]/10 border border-[#fecdd3]/30 text-xs text-[#fecdd3]">
                {syncError}
              </div>
            )}

            {/* 1-Click Magic Setup Link for Partner */}
            {form.scriptUrl.trim() && (
              <div className="pt-2 border-t border-[#332f4a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Share with {partnerTargetName}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Sends a magic link that pre-configures {partnerTargetName}&apos;s phone in 1 tap.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPartnerLink}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#fbcfe8]/15 hover:bg-[#fbcfe8]/25 text-[#fbcfe8] border border-[#fbcfe8]/35 text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  {copiedInvite ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#a7f3d0]" />
                      <span>Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copy Invite Link for {partnerTargetName}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Danger / Local Reset */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#151320]/60 border border-[#332f4a] text-xs">
            <span className="text-slate-400">
              Need to reset local browser cache on this device?
            </span>
            <button
              type="button"
              onClick={onClearAllLocal}
              className="inline-flex items-center gap-1 text-[#fda4af] hover:underline font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Local Cache</span>
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-slate-300 text-sm font-medium transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-sm shadow-lg shadow-[#c4b5fd]/20 transition cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Syncing…</span>
                </>
              ) : savedNotice ? (
                <>
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save & Sync Sheet</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
