'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  ExternalLink,
  CheckCircle2,
  Filter,
  IndianRupee,
  Calendar,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR } from '@/lib/accounting';

export default function ChallansPage() {
  const [challans, setChallans] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Challan Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    challanNumber: '',
    challanDate: new Date().toISOString().slice(0, 10),
    violationDescription: '',
    fineAmount: '',
    paymentDeadline: '',
    paymentStatus: 'unpaid',
    notes: '',
  });

  const fetchChallans = async () => {
    try {
      const res = await fetch('/api/admin/challans');
      if (res.ok) {
        const json = await res.json();
        setChallans(json.challans || []);
      }
      const vRes = await fetch('/api/admin/vehicles');
      if (vRes.ok) {
        const vJson = await vRes.json();
        setVehicles(vJson.vehicles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans();
  }, []);

  const handleMarkPaid = async (challanId: string) => {
    try {
      const res = await fetch('/api/admin/challans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: challanId, paymentStatus: 'paid' }),
      });
      if (res.ok) {
        fetchChallans();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.challanNumber || !formData.violationDescription || !formData.fineAmount) {
      alert('Please fill mandatory fields.');
      return;
    }

    try {
      const res = await fetch('/api/admin/challans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setFormData({
          vehicleId: '',
          challanNumber: '',
          challanDate: new Date().toISOString().slice(0, 10),
          violationDescription: '',
          fineAmount: '',
          paymentDeadline: '',
          paymentStatus: 'unpaid',
          notes: '',
        });
        fetchChallans();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record challan');
      }
    } catch {
      alert('Error recording challan');
    }
  };

  const filteredChallans = challans.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.paymentStatus === statusFilter;
  });

  const totalUnpaidAmount = challans
    .filter((c) => c.paymentStatus === 'unpaid')
    .reduce((sum, c) => sum + c.fineAmount, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Traffic Challans & Fines Tracking
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Reconciliation of RTO e-challans, speeding fines, and payment deadlines
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://echallan.parivahan.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span>Parivahan e-Challan Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
          </a>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Challan</span>
          </button>
        </div>
      </div>

      {/* Filter and Unpaid Dues Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Challans ({challans.length})</option>
            <option value="unpaid">Unpaid Only</option>
            <option value="paid">Settled & Paid</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        <div className="font-semibold text-slate-700">
          Total Unpaid Fines:{' '}
          <span className="font-black text-rose-700 text-sm ml-1">{formatINR(totalUnpaidAmount)}</span>
        </div>
      </div>

      {/* Challans Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Vehicle</th>
                <th className="py-3 px-3">Challan # / Date</th>
                <th className="py-3 px-3">Violation Description</th>
                <th className="py-3 px-3 text-right">Fine Amount</th>
                <th className="py-3 px-3">Payment Deadline</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredChallans.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{c.vehicleReg}</span>
                    <span className="text-[11px] text-slate-500">{c.vehicleName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-blue-700 block">{c.challanNumber}</span>
                    <span className="text-[10px] text-slate-400">{c.challanDate}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800 max-w-xs">{c.violationDescription}</td>
                  <td className="py-3 px-3 text-right font-black text-rose-700">{formatINR(c.fineAmount)}</td>
                  <td className="py-3 px-3 text-slate-600">{c.paymentDeadline || 'Not specified'}</td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={c.paymentStatus} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    {c.paymentStatus === 'unpaid' && (
                      <button
                        onClick={() => handleMarkPaid(c.id)}
                        className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 transition-colors"
                      >
                        Mark as Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Challan Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Record Traffic Challan / Fine"
        subtitle="Log notice received from state police or Parivahan portal"
        maxWidth="lg"
      >
        <form onSubmit={handleAddChallan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Fleet Vehicle *
              </label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose vehicle --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.regNumber} ({v.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Challan Number *
              </label>
              <input
                type="text"
                required
                value={formData.challanNumber}
                onChange={(e) => setFormData({ ...formData, challanNumber: e.target.value })}
                placeholder="e.g. OD02-CH-2026-08912"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Violation Date *
              </label>
              <input
                type="date"
                required
                value={formData.challanDate}
                onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fine Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.fineAmount}
                onChange={(e) => setFormData({ ...formData, fineAmount: e.target.value })}
                placeholder="1000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Violation Description *
            </label>
            <input
              type="text"
              required
              value={formData.violationDescription}
              onChange={(e) => setFormData({ ...formData, violationDescription: e.target.value })}
              placeholder="e.g. Over speeding (68 km/h on NH-16) / Improper stop near bay"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Payment Deadline
              </label>
              <input
                type="date"
                value={formData.paymentDeadline}
                onChange={(e) => setFormData({ ...formData, paymentDeadline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
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
              Record Challan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
