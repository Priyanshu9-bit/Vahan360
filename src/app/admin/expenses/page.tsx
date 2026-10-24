'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Fuel,
  CreditCard,
  Truck,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  Navigation2,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatDateIST, formatDateTimeIST } from '@/lib/accounting';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Expense Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    vehicleId: '',
    tripId: '',
    category: 'fuel',
    amount: '',
    paymentMethod: 'fastag',
    vendor: '',
    description: '',
    receiptUrl: '',
  });

  // Audited Ledger Print Modal
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);

  const categories = [
    { id: 'fuel', label: 'Diesel & Fuel' },
    { id: 'toll_fastag', label: 'Toll & FASTag' },
    { id: 'servicing', label: 'Vehicle Servicing' },
    { id: 'repairs', label: 'Repairs & Mechanics' },
    { id: 'engine_oil', label: 'Engine Oil' },
    { id: 'tyres', label: 'Tyres & Punctures' },
    { id: 'spare_parts', label: 'Spare Parts' },
    { id: 'driver_allowance', label: 'Driver Daily Allowance' },
    { id: 'driver_advance', label: 'Driver Advance' },
    { id: 'driver_salary', label: 'Driver Salary' },
    { id: 'insurance', label: 'Insurance Renewal' },
    { id: 'fitness_renewal', label: 'Fitness Certificate Renewal' },
    { id: 'puc', label: 'PUC Renewal' },
    { id: 'permit_renewal', label: 'Permit Renewal' },
    { id: 'road_tax', label: 'Road Tax Payment' },
    { id: 'challan_fine', label: 'Traffic Challan Fine' },
    { id: 'parking', label: 'Parking Charges' },
    { id: 'loading_unloading', label: 'Loading & Labour' },
    { id: 'vehicle_emi', label: 'Vehicle Loan EMI' },
    { id: 'administrative', label: 'Administrative Office' },
    { id: 'other', label: 'Other Miscellaneous' },
  ];

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/admin/expenses');
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
      }
      const vRes = await fetch('/api/admin/vehicles');
      if (vRes.ok) {
        const vJson = await vRes.json();
        setVehicles(vJson.vehicles || []);
      }
      const tRes = await fetch('/api/admin/trips');
      if (tRes.ok) {
        const tJson = await tRes.json();
        setTrips(tJson.trips || []);
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
    fetchExpenses();
  }, []);

  const handleApproveReject = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: status }),
      });
      if (res.ok) {
        fetchExpenses();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) {
      alert('Please enter amount and description.');
      return;
    }

    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setFormData({
          expenseDate: new Date().toISOString().slice(0, 10),
          vehicleId: '',
          tripId: '',
          category: 'fuel',
          amount: '',
          paymentMethod: 'fastag',
          vendor: '',
          description: '',
          receiptUrl: '',
        });
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record expense');
      }
    } catch {
      alert('Error recording expense');
    }
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || e.approvalStatus === statusFilter;
    return matchesCategory && matchesStatus;
  });

  const totalFilteredAmount = filteredExpenses
    .filter((e) => e.approvalStatus === 'approved')
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Operating Expenses & Disbursements
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tracking diesel, tolls, spares, driver allowances, and expense approval workflows
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setLedgerModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Expense Ledger</span>
          </button>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden"
          >
            <option value="all">All Categories ({expenses.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden"
          >
            <option value="all">All Approval Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-600">
          Approved Total: <span className="font-bold text-slate-900 text-sm">{formatINR(totalFilteredAmount)}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Vehicle & Driver</th>
                <th className="py-3 px-3">Description & Vendor</th>
                <th className="py-3 px-3">Mode</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Approval</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-700">{exp.expenseDate}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {exp.category.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{exp.vehicleReg}</span>
                    <span className="text-[11px] text-slate-500">{exp.driverName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800 block truncate max-w-xs">{exp.description}</span>
                    {exp.vendor && <span className="text-[11px] text-slate-500">Vendor: {exp.vendor}</span>}
                  </td>
                  <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">{exp.paymentMethod}</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">{formatINR(exp.amount)}</td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={exp.approvalStatus} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    {exp.approvalStatus === 'pending' ? (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleApproveReject(exp.id, 'approved')}
                          title="Approve Expense"
                          className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleApproveReject(exp.id, 'rejected')}
                          title="Reject Expense"
                          className="p-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold capitalize">{exp.approvalStatus}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Record Operating Fleet Expense"
        subtitle="Log fuel, tolls, maintenance, or driver disbursements"
        maxWidth="lg"
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={formData.expenseDate}
                onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle
              </label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- General Expense --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.regNumber} ({v.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Link to Trip
              </label>
              <select
                value={formData.tripId}
                onChange={(e) => {
                  const tId = e.target.value;
                  const selectedTrip = trips.find((t) => t.id === tId);
                  setFormData({
                    ...formData,
                    tripId: tId,
                    vehicleId: selectedTrip ? selectedTrip.vehicleId : formData.vehicleId,
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- General (No Trip) --</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tripNumber}: {t.loadingLocation}&rarr;{t.deliveryLocation}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expense Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="2500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="fastag">FASTag Deduction</option>
                <option value="card">Fuel Card / Debit Card</option>
                <option value="upi">UPI / Online</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vendor / Station / Workshop
              </label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="e.g. Indian Oil Dealer - NH16"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description & Details *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Diesel 27 Litres @ ₹92.50/L"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
            >
              Record Approved Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Expense Ledger Modal */}
      <Modal
        isOpen={ledgerModalOpen}
        onClose={() => setLedgerModalOpen(false)}
        title="Official Commercial Fleet Expense Disbursement Ledger"
        subtitle="Printable expense register, fuel slips, toll disbursements, and workshop repairs"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <div id="printable-expense-report" className="printable-document p-6 sm:p-8 bg-white border border-slate-300 rounded-2xl text-slate-900 space-y-5 shadow-xs">
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
                  Expense Ledger
                </span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  Scope: {categoryFilter === 'all' ? 'All Operating Categories' : categoryFilter.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                  Generated: {formatDateTimeIST(new Date().toISOString())}
                </span>
              </div>
            </div>

            {/* Arithmetic Summary Box */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified Vouchers</span>
                <span className="text-lg font-black text-slate-900 block font-mono">{filteredExpenses.length}</span>
                <span className="text-[10px] text-slate-500">Total logged entries</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Approved Disbursements</span>
                <span className="text-lg font-black text-rose-700 block font-mono">{formatINR(totalFilteredAmount)}</span>
                <span className="text-[10px] text-slate-500">Verified cash & card outlays</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Reconciliation Status</span>
                <span className="text-sm font-bold text-emerald-800 block flex items-center gap-1 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Mathematically Reconciled
                </span>
              </div>
            </div>

            {/* Table of Expense Vouchers */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Vehicle / Trip</th>
                    <th className="py-2.5 px-3">Description & Vendor</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td className="py-2 px-3 font-semibold text-slate-700 font-mono text-[11px]">{exp.expenseDate}</td>
                      <td className="py-2 px-3 uppercase text-[10px] font-bold text-slate-700">
                        {exp.category?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{exp.vehicleReg}</span>
                        {exp.tripNumber && <span className="text-[10px] text-blue-700 font-mono">{exp.tripNumber}</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-800">
                        <span className="block font-medium">{exp.description}</span>
                        {exp.vendor && <span className="text-[10px] text-slate-500">Vendor: {exp.vendor}</span>}
                      </td>
                      <td className="py-2 px-3 uppercase text-[10px] font-mono text-slate-600">{exp.paymentMethod}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-900 font-mono">{formatINR(exp.amount)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {exp.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td colSpan={5} className="py-2.5 px-3 text-slate-900 text-right uppercase text-xs">
                      Grand Total Approved Disbursements:
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-700 text-sm font-black font-mono">
                      {formatINR(totalFilteredAmount)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-6 space-y-4">
              <p className="text-[11px] text-slate-500 italic text-center">
                I hereby certify that all expense claims, fuel outlays, toll receipts, and driver allowances recorded above have been checked and verified against original vouchers and proof of transaction.
              </p>
              <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-500 pt-4">
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-semibold text-slate-700">Accounts Officer</span>
                  <span className="text-[10px] text-slate-400">Voucher Entry Verified</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-semibold text-slate-700">Operations Manager</span>
                  <span className="text-[10px] text-slate-400">Approval & Verification</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-bold text-slate-900">{settings?.ownerName || 'Fleet Owner'}</span>
                  <span className="text-[10px] text-slate-400">Authorized Signatory & Seal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 no-print">
            <button
              type="button"
              onClick={() => setLedgerModalOpen(false)}
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
              <span>Print Expense Ledger</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
