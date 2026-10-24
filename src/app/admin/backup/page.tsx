'use client';

import React, { useState, useEffect } from 'react';
import {
  DatabaseBackup,
  Download,
  Upload,
  RefreshCw,
  FileText,
  FileArchive,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  HardDrive,
  FileSpreadsheet,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { formatDateIST, formatDateTimeIST } from '@/lib/accounting';

export default function BackupPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validating, setValidating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [recoveryGuideOpen, setRecoveryGuideOpen] = useState(false);

  const fetchBackupHistory = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const json = await res.json();
        // Read backups from settings/dashboard
        const settingsRes = await fetch('/api/admin/settings');
        if (settingsRes.ok) {
          const sJson = await settingsRes.json();
        }
      }
      // Also fetch directly from backup cron list or settings
      const cronRes = await fetch('/api/backup/cron', { method: 'POST' }); // test read or history
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupHistory();
  }, []);

  const handleManualBackup = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/backup/cron', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Snapshot created successfully: ${data.backup?.filename} (Records: ${data.backup?.recordCount}, Size: ${Math.round(data.backup?.fileSize / 1024)} KB).`,
        });
        fetchBackupHistory();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create backup snapshot.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error executing server backup.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle file select for restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setSelectedFileContent(content);
      setValidating(true);
      setValidationResult(null);

      try {
        const res = await fetch('/api/backup/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileContent: content }),
        });
        const data = await res.json();
        setValidationResult(data);
      } catch {
        setValidationResult({ valid: false, errors: ['Failed to parse file.'] });
      } finally {
        setValidating(false);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!selectedFileContent) return;
    setRestoring(true);

    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: selectedFileContent }),
      });
      const data = await res.json();

      if (res.ok) {
        setRestoreModalOpen(false);
        setMessage({
          type: 'success',
          text: `Database successfully restored! Recovered ${data.restoredCounts?.vehicles || 0} vehicles, ${data.restoredCounts?.drivers || 0} drivers, ${data.restoredCounts?.trips || 0} trips, and ${data.restoredCounts?.expenses || 0} expenses.`,
        });
        setSelectedFileContent('');
        setValidationResult(null);
      } else {
        setMessage({ type: 'error', text: data.error || 'Restoration failed.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error executing restore.' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Backup & Disaster Recovery
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Critical Feature
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete data protection, daily automated backups, portable UTF-8 text exports, and 1-click restoration
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRecoveryGuideOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>Recovery Guide</span>
          </button>
          <button
            onClick={handleManualBackup}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Back Up Now</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-semibold leading-relaxed">{message.text}</div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Download & Restore Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Full TXT Backup */}
        <div className="bg-white rounded-2xl p-6 border-2 border-blue-500/30 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full pointer-events-none -mr-4 -mt-4" />
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Full Business Report & Backup (.txt)</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Download your complete fleet operations report in simple, easy-to-read English. Includes executive financial summary, vehicle details, driver roster, commercial trips, fuel expenses, and monthly driver salaries.
            </p>
          </div>

          <a
            href="/api/backup/download-txt"
            download
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download English Report & Backup (.txt)</span>
          </a>
        </div>

        {/* Card 2: Documents ZIP Backup */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <FileArchive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Documents Backup (.zip)</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Download all uploaded vehicle compliance certificates, RTO fitness documents, driving licence scans, workshop invoices, and expense vouchers with manifest mapping.
            </p>
          </div>

          <a
            href="/api/backup/download-zip"
            download
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Documents Backup (.zip)</span>
          </a>
        </div>

        {/* Card 3: Restore Database */}
        <div className="bg-white rounded-2xl p-6 border-2 border-amber-500/30 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Upload className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Restore from Backup</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Upload a previously generated Vahan360 TXT backup file to restore your entire commercial vehicle operations after server failure, data corruption, or database loss.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRestoreModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Restore from Backup</span>
          </button>
        </div>
      </div>

      {/* CSV Exports Grid */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Standardized CSV Spreadsheets & Accounting Exports</span>
            </h3>
            <p className="text-xs text-slate-500">
              Export specific fleet data modules for Excel, tally, accounting audits, and external analysis
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Vehicles (.csv)', type: 'vehicles' },
            { label: 'Drivers (.csv)', type: 'drivers' },
            { label: 'Trips & Freight (.csv)', type: 'trips' },
            { label: 'Customers (.csv)', type: 'customers' },
            { label: 'Expenses (.csv)', type: 'expenses' },
            { label: 'Customer Payments (.csv)', type: 'payments' },
            { label: 'Salary Records (.csv)', type: 'salaries' },
            { label: 'Financial Reports (.csv)', type: 'financials' },
          ].map((item) => (
            <a
              key={item.type}
              href={`/api/backup/export-csv?type=${item.type}`}
              download
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-all group"
            >
              <span>{item.label}</span>
              <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
            </a>
          ))}
        </div>
      </div>

      {/* Backup Schedule & Security Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">Automated Daily Server Backup Policy</h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The server executes an automated snapshot every day at 02:00 AM IST. Backups are stored in a dedicated local directory (<code className="text-blue-300 font-mono">data/backups/</code>) and verified with SHA-256 cryptographic checksums.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Retention Policy</span>
              <span className="font-bold text-white text-sm">30 Rolling Backups</span>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Integrity Check</span>
              <span className="font-bold text-emerald-400 text-sm">SHA-256 Verified</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Security & Privacy Protections</h3>
          </div>
          <ul className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Password hashes, session tokens, and API secret keys are strictly stripped from all backups.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Only the designated Admin Owner can trigger backups or execute restorations.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Every backup generation and restoration event is permanently recorded in the immutable audit log.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Restore Modal */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setValidationResult(null);
          setSelectedFileContent('');
        }}
        title="Restore Vahan360 Fleet Database"
        subtitle="Upload a valid UTF-8 TXT backup to recover business operations"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Automatic Rollback Safety:</span> Before executing this restore, the system will automatically snapshot your current database so no data is irreversibly lost.
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Vahan360 Backup File (.txt)
            </label>
            <input
              type="file"
              accept=".txt"
              onChange={handleFileChange}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-xl p-2"
            />
          </div>

          {validating && (
            <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Validating backup structure and entity counts...</span>
            </div>
          )}

          {validationResult && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Business: {validationResult.businessName || 'Vahan360'}
                </span>
                {validationResult.valid ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Valid Vahan360 Backup
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                    <X className="w-3 h-3" /> Invalid Format
                  </span>
                )}
              </div>

              {validationResult.valid && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Vehicles</span>
                    <span className="font-bold text-slate-900">{validationResult.counts?.vehicles || 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Drivers</span>
                    <span className="font-bold text-slate-900">{validationResult.counts?.drivers || 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Trips</span>
                    <span className="font-bold text-slate-900">{validationResult.counts?.trips || 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Expenses</span>
                    <span className="font-bold text-slate-900">{validationResult.counts?.expenses || 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Payments</span>
                    <span className="font-bold text-slate-900">{validationResult.counts?.tripPayments || 0}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Compliance Docs</span>
                    <span className="font-bold text-slate-900">{validationResult.counts?.documents || 0}</span>
                  </div>
                </div>
              )}

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <p className="font-bold mb-1">Validation Errors:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {validationResult.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRestoreModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult?.valid || restoring}
              onClick={handleConfirmRestore}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
            >
              {restoring ? (
                <span>Restoring Database...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirm & Restore Database</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Recovery Guide Modal */}
      <Modal
        isOpen={recoveryGuideOpen}
        onClose={() => setRecoveryGuideOpen(false)}
        title="Disaster Recovery & Server Restoration Procedure"
        subtitle="Step-by-step restoration checklist in case of complete server loss"
        maxWidth="2xl"
      >
        <div className="text-xs text-slate-700 space-y-3.5 max-h-[65vh] overflow-y-auto pr-1">
          <p className="leading-relaxed">
            If your server crashes, the hosting account is terminated, or the database is deleted, follow this official 8-step disaster recovery checklist:
          </p>

          <div className="space-y-2.5 border-l-2 border-blue-500 pl-3">
            <div>
              <p className="font-bold text-slate-900">1. Deploy Fresh Vahan360 Codebase</p>
              <p className="text-slate-500 text-[11px]">Clone or extract application source code onto the new server and execute <code>npm install</code>.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">2. Configure Environment Variables</p>
              <p className="text-slate-500 text-[11px]">Set <code>SESSION_SECRET</code> and <code>CRON_SECRET</code> in <code>.env.local</code>.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">3. Provision Database Schema</p>
              <p className="text-slate-500 text-[11px]">If using cloud Supabase, execute <code>supabase_schema.sql</code> in the Supabase SQL Editor.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">4. Start Application</p>
              <p className="text-slate-500 text-[11px]">Run <code>npm run build && npm run start</code> and open the admin login.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">5. Restore Database from TXT Backup</p>
              <p className="text-slate-500 text-[11px]">Open <b>Backup & Restore</b>, upload your downloaded <code>Vahan360_Full_Backup_*.txt</code>, and click Restore.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">6. Restore Document & Receipt Files</p>
              <p className="text-slate-500 text-[11px]">Unzip <code>Vahan360_Documents_Backup_*.zip</code> into <code>data/uploads/</code>.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">7. Verify Totals & Relationships</p>
              <p className="text-slate-500 text-[11px]">Confirm all 3 commercial pickup vehicles, trip freight balances, and driver records are intact.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">8. Verify Admin & Driver Login</p>
              <p className="text-slate-500 text-[11px]">Confirm owner and driver portal logins are operational.</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
