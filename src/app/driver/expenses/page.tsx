'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Plus, CheckCircle2, Clock, X, AlertCircle } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { formatINR } from '@/lib/accounting';

export default function DriverExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'fuel',
    amount: '',
    paymentMethod: 'fastag',
    vendor: '',
    description: '',
  });

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/driver/expenses');
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) {
      alert('Please fill amount and description.');
      return;
    }

    try {
      const res = await fetch('/api/driver/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setModalOpen(false);
        setFormData({
          category: 'fuel',
          amount: '',
          paymentMethod: 'fastag',
          vendor: '',
          description: '',
        });
        fetchExpenses();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit expense');
      }
    } catch {
      alert('Error submitting expense');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            My Fuel, Toll & Trip Expense Claims
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Submit reimbursement claims for diesel, tolls, daily allowances, and minor repairs
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Expense Claim</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Vendor / Station</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3">Payment Mode</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3 text-center">Owner Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 text-slate-600 font-semibold">{e.expenseDate}</td>
                  <td className="py-3 px-3 font-bold uppercase text-[10px] text-slate-700">
                    {e.category.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-3 text-slate-700">{e.vendor || '—'}</td>
                  <td className="py-3 px-3 text-slate-900 font-medium">{e.description}</td>
                  <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">{e.paymentMethod}</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">{formatINR(e.amount)}</td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={e.approvalStatus} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Submit Trip Expense Claim"
        subtitle="Claim reimbursement for diesel, highway tolls, food allowance, or repairs"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="fuel">Diesel / Fuel</option>
              <option value="toll_fastag">FASTag / Toll Plaza</option>
              <option value="driver_allowance">Driver Food & Road Allowance</option>
              <option value="parking">Parking Charges</option>
              <option value="loading_unloading">Loading / Labour</option>
              <option value="repairs">Puncture / Minor Road Repair</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Amount Spent (₹) *
            </label>
            <input
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="350"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Vendor / Petrol Bunk
            </label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="e.g. Bharat Petroleum - Highway 16"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description & Purpose *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Diesel 15 Litres @ ₹92.50/L"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
            >
              Submit Claim
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
