import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, Check } from 'lucide-react';
import { AppSettings, Expense } from '../types';
import {
  exportExpensesToCsv,
  formatMoney,
  parseCsvImport
} from '../lib/finance';

interface ImportExportModalProps {
  isOpen: boolean;
  expenses: Expense[];
  settings: AppSettings;
  onClose: () => void;
  onImportExpenses: (items: Expense[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  expenses,
  settings,
  onClose,
  onImportExpenses
}) => {
  const defaultTargetId =
    settings.activeAccountId !== 'all'
      ? settings.activeAccountId
      : settings.accounts[0]?.id || 'default';

  const [targetAccountId, setTargetAccountId] = useState(defaultTargetId);
  const [csvText, setCsvText] = useState('');
  const [previewItems, setPreviewItems] = useState<Expense[]>([]);
  const [importDone, setImportDone] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setCsvText(content);
      const parsed = parseCsvImport(content, settings, targetAccountId);
      setPreviewItems(parsed);
      setImportDone(false);
    };
    reader.readAsText(file);
  };

  const handleParseText = (val: string, accId: string = targetAccountId) => {
    setCsvText(val);
    setPreviewItems(parseCsvImport(val, settings, accId));
    setImportDone(false);
  };

  const handleConfirmImport = () => {
    if (previewItems.length === 0) return;
    onImportExpenses(previewItems);
    setImportDone(true);
    setTimeout(() => {
      setPreviewItems([]);
      setCsvText('');
      setImportDone(false);
      onClose();
    }, 700);
  };

  const handleExportCsv = () => {
    const csv = exportExpensesToCsv(expenses, settings);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `splitsheet-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const active = expenses.filter((e) => !e.isDeleted);
    const blob = new Blob([JSON.stringify(active, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `splitsheet-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0f0d16]/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1e1b2b] border border-[#332f4a] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-[#1e1b2b]/95 backdrop-blur border-b border-[#332f4a]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#c4b5fd]" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Tricount / CSV Import & Export
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

        <div className="p-5 space-y-6">
          {/* Export Section */}
          <div className="p-4 rounded-2xl bg-[#151320] border border-[#332f4a] space-y-3">
            <div>
              <h4 className="text-sm font-bold text-white">
                Export Your Expenses ({expenses.filter((e) => !e.isDeleted).length} items)
              </h4>
              <p className="text-xs text-slate-400">
                Download a local spreadsheet CSV or full JSON backup anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-xs font-semibold text-slate-100 border border-[#423c5e] transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#a7f3d0]" />
                <span>Download CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2a263d] hover:bg-[#35304d] text-xs font-semibold text-slate-100 border border-[#423c5e] transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#c4b5fd]" />
                <span>Download JSON Backup</span>
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-bold text-white">
                Import from Tricount or CSV
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose which Account to import into, then upload your Tricount CSV file or paste rows.
              </p>
            </div>

            {/* Target Account Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Import into Account / Group:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {settings.accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      setTargetAccountId(acc.id);
                      if (csvText) handleParseText(csvText, acc.id);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      targetAccountId === acc.id
                        ? 'bg-[#c4b5fd]/25 text-[#ddd6fe] border-[#c4b5fd]'
                        : 'bg-[#151320] text-slate-400 border-[#332f4a] hover:text-slate-200'
                    }`}
                  >
                    <span>{acc.emoji}</span>
                    <span>{acc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-[#3e3859] hover:border-[#c4b5fd]/60 bg-[#151320]/60 cursor-pointer transition">
              <Upload className="w-6 h-6 text-[#c4b5fd] mb-1.5" />
              <span className="text-xs sm:text-sm font-semibold text-slate-200">
                Choose a .csv file to upload
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5">
                Supports comma, semicolon, or tab-separated files
              </span>
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Or paste CSV lines directly:
              </label>
              <textarea
                rows={4}
                value={csvText}
                onChange={(e) => handleParseText(e.target.value)}
                placeholder={`Title,Amount,Currency,Paid By,Date,Category\nSupermarket,64.80,${settings.baseCurrency},${settings.userAName},2026-10-15,Groceries\nPizza Night,38.00,${settings.baseCurrency},${settings.userBName},2026-10-18,Dining Out`}
                className="w-full p-3 rounded-xl bg-[#151320] border border-[#332f4a] text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#c4b5fd]"
              />
            </div>

            {previewItems.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#c4b5fd]/10 border border-[#c4b5fd]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#ddd6fe]">
                    Ready to import {previewItems.length} expenses into{' '}
                    {settings.accounts.find((a) => a.id === targetAccountId)?.name ||
                      settings.accounts[0]?.name ||
                      'General'}
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#c4b5fd] hover:bg-[#ddd6fe] text-[#181622] font-bold text-xs transition cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      {importDone ? 'Imported!' : `Import ${previewItems.length} Rows`}
                    </span>
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {previewItems.slice(0, 25).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-[#151320]/90 text-slate-300"
                    >
                      <span className="truncate max-w-[55%]">
                        <strong>{item.title}</strong> ({item.date}) • {item.category}
                      </span>
                      <span className="font-mono text-[#a7f3d0]">
                        {item.paidBy === 'userA'
                          ? settings.userAName
                          : settings.userBName}{' '}
                        paid {formatMoney(item.amount, item.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
