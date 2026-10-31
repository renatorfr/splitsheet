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
      const parsed = parseCsvImport(content, settings);
      setPreviewItems(parsed);
      setImportDone(false);
    };
    reader.readAsText(file);
  };

  const handleParseText = (val: string) => {
    setCsvText(val);
    setPreviewItems(parseCsvImport(val, settings));
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-400" />
            <h3 className="text-base sm:text-lg font-bold text-white">
              Tricount / CSV Import & Export
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Export Section */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-teal-400" />
                <span>Download CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-100 border border-slate-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-indigo-400" />
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
                Export your Tricount history as CSV (or paste rows with columns like{' '}
                <code className="text-teal-300">Title, Amount, Currency, Paid By, Date, Category</code>).
                Names matching <strong>{settings.userBName}</strong> map to Partner B; others map to{' '}
                <strong>{settings.userAName}</strong>.
              </p>
            </div>

            <label className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-700 hover:border-teal-500/60 bg-slate-950/60 cursor-pointer transition">
              <Upload className="w-6 h-6 text-teal-400 mb-1.5" />
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
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-teal-500"
              />
            </div>

            {previewItems.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300">
                    Ready to import {previewItems.length} expenses
                  </span>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition cursor-pointer"
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
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-950/80 text-slate-300"
                    >
                      <span className="truncate max-w-[55%]">
                        <strong>{item.title}</strong> ({item.date}) • {item.category}
                      </span>
                      <span className="font-mono text-teal-300">
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
