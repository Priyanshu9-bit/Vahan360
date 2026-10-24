'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, IndianRupee, Calendar, CheckCircle2, Clock, LogOut, AlertTriangle, Check } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { formatINR } from '@/lib/accounting';

export default function DriverSalaryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resignModalOpen, setResignModalOpen] = useState(false);
  const [resignReason, setResignReason] = useState('');
  const [submittingResign, setSubmittingResign] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const loadData = async () => {
    try {
      const res = await fetch('/api/driver/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuitJob = async () => {
    setSubmittingResign(true);
    try {
      const res = await fetch('/api/driver/resign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: resignReason }),
      });
      if (res.ok) {
        setResignModalOpen(false);
        setActionMessage('Your job resignation has been submitted to the owner. Final settlement recorded.');
        setTimeout(() => setActionMessage(''), 5000);
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit resignation');
      }
    } catch {
      alert('Error submitting resignation request');
    } finally {
      setSubmittingResign(false);
    }
  };

  const salary = data?.salary || {};
  const records = salary.records || [];
  const payments = salary.payments || [];
  const driver = data?.driver || {};
  const settlementSummary = data?.settlementSummary;

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              My Salary Slips & Payments
            </h2>
            <StatusBadge status={driver.accountStatus || 'approved'} size="sm" />
          </div>
          <p className="text-xs text-slate-500">
            Monthly salary statements, trip bonuses, advances deducted, and bank disbursements
          </p>
        </div>

        {driver.accountStatus === 'resigned' ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Resignation Submitted</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setResignModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Quit Job / Resign</span>
          </button>
        )}
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="font-bold cursor-pointer">&times;</button>
        </div>
      )}

      {/* Financial Settlement & Net Pending Amount Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Contract & Employment</span>
            <span className="text-base font-bold text-white capitalize">{driver.salaryType} Contract</span>
            <p className="text-xs text-slate-400 mt-0.5">
              Agreed pay: <b className="text-emerald-400">{formatINR(driver.agreedSalary)}/mo</b>
            </p>
          </div>

          <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/15">
            <span className="text-[10px] text-slate-300 uppercase font-bold block">
              Net Amount Pending for You
            </span>
            <span className={`text-2xl font-black ${
              (settlementSummary?.netPendingAmount || 0) > 0
                ? 'text-emerald-400'
                : (settlementSummary?.netPendingAmount || 0) < 0
                ? 'text-amber-400'
                : 'text-white'
            }`}>
              {formatINR(settlementSummary?.netPendingAmount || 0)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 block font-medium">Unpaid Salary Dues</span>
            <span className="font-bold text-white text-sm">
              {formatINR(settlementSummary?.unpaidSalaryDue || 0)}
            </span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 block font-medium">Reimbursable Expenses</span>
            <span className="font-bold text-emerald-400 text-sm">
              +{formatINR(settlementSummary?.approvedUnpaidExpenses || 0)}
            </span>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block font-medium">Settlement Status</span>
            <span className="font-semibold text-slate-200 text-xs">
              {settlementSummary?.statusNotice || 'Up-to-date calculation'}
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Salary Statements */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Monthly Salary Statements</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b">
              <tr>
                <th className="p-2.5">Period</th>
                <th className="p-2.5 text-right">Base Salary</th>
                <th className="p-2.5 text-right">Trip Incentives</th>
                <th className="p-2.5 text-right text-amber-700">Advances</th>
                <th className="p-2.5 text-right text-rose-700">Bunks Cut</th>
                <th className="p-2.5 text-right font-bold text-slate-900">Net Payable</th>
                <th className="p-2.5 text-right font-bold text-emerald-700">Paid</th>
                <th className="p-2.5 text-right font-bold text-rose-700">Balance</th>
                <th className="p-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r: any) => (
                <tr key={r.id}>
                  <td className="p-2.5 font-bold text-slate-900">{r.periodMonth}</td>
                  <td className="p-2.5 text-right">{formatINR(r.baseSalary)}</td>
                  <td className="p-2.5 text-right text-blue-700">+{formatINR(r.tripAllowance)}</td>
                  <td className="p-2.5 text-right text-amber-700">-{formatINR(r.advancesDeducted)}</td>
                  <td className="p-2.5 text-right text-rose-700">
                    {r.bunkDeductions ? (
                      <span className="font-semibold">-{formatINR(r.bunkDeductions)} ({r.bunkDays || 0}d)</span>
                    ) : (
                      <span className="text-slate-400">₹0</span>
                    )}
                  </td>
                  <td className="p-2.5 text-right font-black text-slate-900">{formatINR(r.netPayable)}</td>
                  <td className="p-2.5 text-right font-bold text-emerald-700">{formatINR(r.paidAmount)}</td>
                  <td className="p-2.5 text-right font-bold text-rose-700">
                    {r.balanceDue > 0 ? formatINR(r.balanceDue) : <span className="text-emerald-600">Paid</span>}
                  </td>
                  <td className="p-2.5 text-center"><StatusBadge status={r.status} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Leaves & Bunk Attendance Records (Read-Only) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>My Leaves & Absence Records</span>
            </h3>
            <p className="text-xs text-slate-500">
              Attendance records and salary cuts logged by Fleet Admin (Read-Only)
            </p>
          </div>
          <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Total Logged: {(data?.leaves || salary.leaves || []).length}
          </span>
        </div>

        {(!data?.leaves || data.leaves.length === 0) ? (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed rounded-xl bg-slate-50">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
            <p className="font-bold text-slate-700">Clean Attendance Record</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No unexcused absences, bunks, or salary deductions recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b">
                <tr>
                  <th className="p-2.5">Date of Absence</th>
                  <th className="p-2.5">Leave / Absence Type</th>
                  <th className="p-2.5">Reason / Admin Remarks</th>
                  <th className="p-2.5 text-right font-bold text-rose-700">Salary Cut Impact</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.leaves.map((l: any) => (
                  <tr key={l.id}>
                    <td className="p-2.5 font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{l.date}</span>
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        l.leaveType === 'unexcused_bunk'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : l.leaveType === 'sick'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {l.leaveType === 'unexcused_bunk' ? 'Unexcused Bunk (Duty Off)' : l.leaveType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 max-w-xs">{l.reason || 'No specific reason entered by admin'}</td>
                    <td className="p-2.5 text-right font-bold text-rose-700">
                      {l.status === 'penalty_applied' && Number(l.deductionAmount) > 0 ? (
                        <span>-{formatINR(l.deductionAmount)}</span>
                      ) : (
                        <span className="text-slate-400">₹0 (Waived)</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        l.status === 'penalty_applied'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {l.status === 'penalty_applied' ? `Deducted (${l.deductedInSalaryMonth})` : 'Waived'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disbursed Payment History */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900">Disbursed Payments & Advances Received</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Type</th>
                <th className="p-2.5">Payment Mode</th>
                <th className="p-2.5">UTR / Reference</th>
                <th className="p-2.5 text-right font-bold text-slate-900">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p: any) => (
                <tr key={p.id}>
                  <td className="p-2.5 text-slate-600">{p.paymentDate}</td>
                  <td className="p-2.5 capitalize font-bold text-slate-800">{p.paymentType}</td>
                  <td className="p-2.5 uppercase font-medium text-slate-600">{p.paymentMethod}</td>
                  <td className="p-2.5 font-mono text-slate-500">{p.referenceNo || 'Direct Transfer'}</td>
                  <td className="p-2.5 text-right font-black text-emerald-700">{formatINR(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quit Job / Resign Settlement Modal */}
      <Modal
        isOpen={resignModalOpen}
        onClose={() => setResignModalOpen(false)}
        title="Quit Job / Resignation Request"
        subtitle="Review your pending financial settlement and dues before submitting resignation"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">Financial Settlement Review</span>
              <span className="text-xs font-mono font-bold text-slate-600">{driver.fullName}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pending Unpaid Salary:</span>
                <span className="font-bold text-slate-900">{formatINR(settlementSummary?.unpaidSalaryDue || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Approved Expense Reimbursements:</span>
                <span className="font-bold text-emerald-700">+{formatINR(settlementSummary?.approvedUnpaidExpenses || 0)}</span>
              </div>
              {Number(settlementSummary?.pendingExpenseClaims) > 0 && (
                <div className="flex items-center justify-between text-amber-800">
                  <span>Claims Awaiting Approval:</span>
                  <span className="font-semibold">{formatINR(settlementSummary?.pendingExpenseClaims)}</span>
                </div>
              )}
              {Number(settlementSummary?.unreconciledAdvances) > 0 && (
                <div className="flex items-center justify-between text-rose-700">
                  <span>Advances Balance:</span>
                  <span className="font-semibold">-{formatINR(settlementSummary?.unreconciledAdvances)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black">
                <span className="text-slate-900">Net Pending Settlement:</span>
                <span className={
                  (settlementSummary?.netPendingAmount || 0) > 0
                    ? 'text-emerald-700'
                    : (settlementSummary?.netPendingAmount || 0) < 0
                    ? 'text-amber-700'
                    : 'text-slate-900'
                }>
                  {formatINR(settlementSummary?.netPendingAmount || 0)}
                </span>
              </div>
            </div>
          </div>

          {(settlementSummary?.netPendingAmount || 0) > 0 ? (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Company Settlement Payable:</span>
                The fleet owner owes you a net total of <b>{formatINR(settlementSummary?.netPendingAmount)}</b>. Upon submitting resignation, the owner will process your final payout and exit clearance.
              </div>
            </div>
          ) : (settlementSummary?.netPendingAmount || 0) < 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Outstanding Advance to Settle:</span>
                You have an advance balance of <b>{formatINR(Math.abs(settlementSummary?.netPendingAmount))}</b> to be settled with the fleet company before final exit clearance.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-xs flex items-start gap-2.5">
              <Check className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">All Dues Cleared:</span>
                All salary slips and expense claims have zero pending balance (₹0).
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Reason for Quitting / Notes for Owner (Optional)
            </label>
            <textarea
              rows={3}
              value={resignReason}
              onChange={(e) => setResignReason(e.target.value)}
              placeholder="e.g. Relocating back to hometown / Personal reasons / Better opportunity"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setResignModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submittingResign}
              onClick={handleQuitJob}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>{submittingResign ? 'Submitting...' : 'Confirm & Quit Job'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
