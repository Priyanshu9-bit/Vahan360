'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Calendar,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Clock,
  Printer,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR } from '@/lib/accounting';

export default function SalariesPage() {
  const [salaryRecords, setSalaryRecords] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('2026-10');

  // Generate Month Modal
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [genPeriod, setGenPeriod] = useState('2026-10');

  // Record Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    salaryRecordId: '',
    driverId: '',
    amount: '',
    paymentType: 'salary',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer',
    referenceNo: '',
    notes: '',
  });

  // Pay Slip Print Modal
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedSlipRecord, setSelectedSlipRecord] = useState<any>(null);

  const fetchSalaries = async () => {
    try {
      const res = await fetch(`/api/admin/salaries?period=${periodFilter}`);
      if (res.ok) {
        const json = await res.json();
        setSalaryRecords(json.salaryRecords || []);
      }
      const drvRes = await fetch('/api/admin/drivers');
      if (drvRes.ok) {
        const dJson = await drvRes.json();
        setDrivers(dJson.drivers || []);
      }
      const setRes = await fetch('/api/admin/settings');
      if (setRes.ok) {
        const sJson = await setRes.json();
        setSettings(sJson.settings || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, [periodFilter]);

  const handleGenerateMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_month', periodMonth: genPeriod }),
      });
      if (res.ok) {
        setGenerateModalOpen(false);
        setPeriodFilter(genPeriod);
        fetchSalaries();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to generate month');
      }
    } catch {
      alert('Error generating salary period');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'record_payment', ...paymentFormData }),
      });
      if (res.ok) {
        setPaymentModalOpen(false);
        setPaymentFormData({
          salaryRecordId: '',
          driverId: '',
          amount: '',
          paymentType: 'salary',
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMethod: 'bank_transfer',
          referenceNo: '',
          notes: '',
        });
        fetchSalaries();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record payment');
      }
    } catch {
      alert('Error recording payment');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Driver Salaries, Allowances & Advances
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Automated monthly payroll statements, advance reconciliations, and payment receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGenerateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Generate Monthly Statements</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Disburse Salary / Advance</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Salary Period:</span>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden"
          >
            <option value="2026-10">October 2026 (Active Period)</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-08">August 2026</option>
          </select>
        </div>

        <div className="text-slate-500 font-semibold">
          Total Statements: <span className="font-bold text-slate-900">{salaryRecords.length}</span>
        </div>
      </div>

      {/* Salary Statements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Driver Name</th>
                <th className="py-3 px-3">Terms</th>
                <th className="py-3 px-3 text-right">Base Salary</th>
                <th className="py-3 px-3 text-right">Trip Allowances</th>
                <th className="py-3 px-3 text-right">Advances Deducted</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900">Net Payable</th>
                <th className="py-3 px-3 text-right font-bold text-emerald-700">Disbursed Paid</th>
                <th className="py-3 px-3 text-right font-bold text-rose-700">Balance Due</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salaryRecords.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{r.driverName}</span>
                    <span className="text-[11px] text-slate-500">{r.driverPhone}</span>
                  </td>
                  <td className="py-3 px-3 capitalize font-medium text-slate-600">{r.salaryType}</td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-800">{formatINR(r.baseSalary)}</td>
                  <td className="py-3 px-3 text-right font-medium text-blue-700">+{formatINR(r.tripAllowance)}</td>
                  <td className="py-3 px-3 text-right font-medium text-amber-700">-{formatINR(r.advancesDeducted)}</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">{formatINR(r.netPayable)}</td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">{formatINR(r.paidAmount)}</td>
                  <td className="py-3 px-3 text-right font-bold text-rose-700">
                    {r.balanceDue > 0 ? formatINR(r.balanceDue) : <span className="text-emerald-600">Paid in Full</span>}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {r.balanceDue > 0 ? (
                        <button
                          onClick={() => {
                            setPaymentFormData({
                              salaryRecordId: r.id,
                              driverId: r.driverId,
                              amount: String(r.balanceDue),
                              paymentType: 'salary',
                              paymentDate: new Date().toISOString().slice(0, 10),
                              paymentMethod: 'bank_transfer',
                              referenceNo: '',
                              notes: `Settlement for ${r.periodMonth}`,
                            });
                            setPaymentModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-200 transition-colors"
                        >
                          Pay
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-bold flex items-center justify-center gap-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSlipRecord(r);
                          setSlipModalOpen(true);
                        }}
                        title="Print Driver Pay Slip"
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {salaryRecords.length === 0 && !loading && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No salary statements generated for {periodFilter}.</p>
          <p className="text-xs text-slate-400 mt-1">Click "Generate Monthly Statements" to calculate payroll for approved drivers.</p>
        </div>
      )}

      {/* Generate Month Modal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Monthly Salary Statements"
        subtitle="Calculates base salary, trip incentives, and deducts advances automatically"
        maxWidth="md"
      >
        <form onSubmit={handleGenerateMonth} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Salary Month (YYYY-MM) *
            </label>
            <input
              type="month"
              required
              value={genPeriod}
              onChange={(e) => setGenPeriod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            This will calculate payroll for all active approved drivers, automatically credit completed trip bonuses, and safely deduct any festival or fuel advances issued during the period.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGenerateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
            >
              Generate Statements
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment / Advance Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Disburse Driver Payment / Advance"
        subtitle="Record salary disbursement, festival advance, or trip allowance"
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select Driver *
            </label>
            <select
              required
              value={paymentFormData.driverId}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, driverId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Driver --</option>
              {drivers
                .filter((d) => d.accountStatus === 'approved')
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.phone})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Disbursement Type
              </label>
              <select
                value={paymentFormData.paymentType}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="salary">Salary Settlement</option>
                <option value="advance">Advance Disbursement</option>
                <option value="allowance">Trip Allowance</option>
                <option value="bonus">Bonus / Incentive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                placeholder="5000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Date
              </label>
              <input
                type="date"
                required
                value={paymentFormData.paymentDate}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="upi">UPI / Online</option>
                <option value="cash">Cash Handover</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Bank UTR Reference / Notes
            </label>
            <input
              type="text"
              value={paymentFormData.referenceNo}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, referenceNo: e.target.value })}
              placeholder="e.g. IMPS/6100588219"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
            >
              Confirm Disbursement
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Driver Pay Slip Modal */}
      <Modal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        title="Official Commercial Driver Salary Settlement Slip"
        subtitle="Printable monthly payroll voucher, allowances, advance reconciliation, and payment slip"
        maxWidth="2xl"
      >
        {selectedSlipRecord && (
          <div className="space-y-4">
            <div id="printable-salary-slip" className="printable-document p-6 sm:p-8 bg-white border border-slate-300 rounded-2xl text-slate-900 space-y-5 shadow-xs">
              {/* Letterhead */}
              <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {settings?.businessName || 'NAYAK TRANSPORT'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600">
                    {settings?.tagline || 'Commercial Fleet Logistics & Transport Operations'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {settings?.address || 'Plot 104, Transport Nagar, Cuttack Road, Bhubaneswar, Odisha'}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    GSTIN: {settings?.gstin || '21AAACV3600A1Z5'} &bull; Ph: {settings?.phone || '+91 99380 75395'} &bull; Email: {settings?.email || 'sushantan34@gmail.com'}
                  </p>
                </div>
                <div className="sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-sm font-black uppercase text-blue-900 block">
                    Driver Pay Slip
                  </span>
                  <span className="text-xs font-bold text-slate-800 font-mono block">
                    Period: {selectedSlipRecord.periodMonth}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Statement ID: {selectedSlipRecord.id.slice(0, 14)}
                  </span>
                </div>
              </div>

              {/* Driver & Terms Profile */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Employee / Driver Profile</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedSlipRecord.driverName}</div>
                  <div className="text-slate-700">Phone: {selectedSlipRecord.driverPhone || '—'}</div>
                  <div className="text-slate-600 font-mono">DL No: {selectedSlipRecord.driverDlNumber || 'OD02 122345678'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Employment & Terms</span>
                  <div className="font-bold text-slate-900 text-sm capitalize">{selectedSlipRecord.salaryType} Contract</div>
                  <div className="text-slate-700">Assigned Vehicle: <b>{selectedSlipRecord.vehicleReg || 'Fleet Truck'}</b></div>
                  <div className="text-slate-600">Disbursement Currency: INR (₹)</div>
                </div>
              </div>

              {/* Earnings & Deductions Dual Ledger */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-200 flex items-center justify-between">
                    <span className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">Gross Earnings</span>
                    <span className="font-mono font-bold text-emerald-800 text-[11px]">Amount (₹)</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between text-slate-700">
                      <span>Basic Fixed Salary:</span>
                      <span className="font-semibold">{formatINR(selectedSlipRecord.baseSalary)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Trip Allowances / Bhatta:</span>
                      <span className="font-semibold text-blue-700">+{formatINR(selectedSlipRecord.tripAllowance)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Performance / Safe Driving Bonus:</span>
                      <span className="font-semibold text-blue-700">+{formatINR(selectedSlipRecord.bonus || 0)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm">
                      <span>Gross Total Earnings:</span>
                      <span className="text-emerald-800">
                        {formatINR(Number(selectedSlipRecord.baseSalary) + Number(selectedSlipRecord.tripAllowance) + Number(selectedSlipRecord.bonus || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-50 px-3 py-2 border-b border-rose-200 flex items-center justify-between">
                    <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px]">Deductions & Recoveries</span>
                    <span className="font-mono font-bold text-rose-800 text-[11px]">Amount (₹)</span>
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between text-slate-700">
                      <span>Advances Deducted:</span>
                      <span className="font-semibold text-amber-700">-{formatINR(selectedSlipRecord.advancesDeducted)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Other Deductions (Fines/Damages):</span>
                      <span className="font-semibold text-rose-700">-{formatINR(selectedSlipRecord.otherDeductions || 0)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Tax / Provident Fund:</span>
                      <span>₹0</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-2 text-sm">
                      <span>Total Deductions:</span>
                      <span className="text-rose-700">
                        {formatINR(Number(selectedSlipRecord.advancesDeducted) + Number(selectedSlipRecord.otherDeductions || 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay Mathematical Proof */}
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                    Net Salary Calculation & Settlement Proof
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedSlipRecord.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedSlipRecord.status === 'paid' ? 'Disbursed in Full' : 'Disbursement Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1 text-center">
                  <div className="p-2 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">Net Payable</span>
                    <span className="text-sm font-black text-slate-900 block">{formatINR(selectedSlipRecord.netPayable)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">Paid to Date</span>
                    <span className="text-sm font-bold text-emerald-700 block">{formatINR(selectedSlipRecord.paidAmount)}</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-blue-100">
                    <span className="text-[10px] text-slate-400 uppercase font-sans block">Balance Due</span>
                    <span className={`text-sm font-black block ${selectedSlipRecord.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatINR(selectedSlipRecord.balanceDue)}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-blue-900/80 font-mono text-center pt-1">
                  Formula: Gross Earnings ({formatINR(Number(selectedSlipRecord.baseSalary) + Number(selectedSlipRecord.tripAllowance) + Number(selectedSlipRecord.bonus || 0))}) - Deductions ({formatINR(Number(selectedSlipRecord.advancesDeducted) + Number(selectedSlipRecord.otherDeductions || 0))}) = Net Payable {formatINR(selectedSlipRecord.netPayable)}
                </p>
              </div>

              {/* Statutory Signatures */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-semibold text-slate-700">Driver's Signature</span>
                  <span className="text-[10px] text-slate-400">Payment & Calculations Received & Accepted</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-semibold text-slate-700">Fleet Owner / Authorized Accountant</span>
                  <span className="text-[10px] text-slate-400">Disbursed with Official Seal</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 no-print">
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Pay Slip</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
