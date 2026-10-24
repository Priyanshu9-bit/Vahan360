'use client';

import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Filter,
  Shield,
  CreditCard,
  Truck,
  Users,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatDateIST } from '@/lib/accounting';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [driverLicences, setDriverLicences] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'vehicle' | 'driver'>('vehicle');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Document Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    docType: 'insurance',
    docNumber: '',
    issueDate: new Date().toISOString().slice(0, 10),
    expiryDate: '',
    issuingAuthority: '',
    renewalCost: '',
  });

  const fetchDocs = async () => {
    try {
      const res = await fetch('/api/admin/documents');
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.documents || []);
        setDriverLicences(json.driverLicences || []);
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
    fetchDocs();
  }, []);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.docNumber || !formData.expiryDate) {
      alert('Please fill mandatory fields.');
      return;
    }

    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setFormData({
          vehicleId: '',
          docType: 'insurance',
          docNumber: '',
          issueDate: new Date().toISOString().slice(0, 10),
          expiryDate: '',
          issuingAuthority: '',
          renewalCost: '',
        });
        fetchDocs();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add document');
      }
    } catch {
      alert('Error adding document');
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (statusFilter === 'all') return true;
    return d.status === statusFilter;
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Document Compliance & Expiry Reminders
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tracking RTO Fitness, Comprehensive Insurance, PUC, Permits, Road Tax, and Commercial Driving Licences
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Fleet Document</span>
        </button>
      </div>

      {/* Tabs and Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('vehicle')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'vehicle' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Vehicle Compliance ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'driver' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Driver Licences ({driverLicences.length})
          </button>
        </div>

        {activeTab === 'vehicle' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
            >
              <option value="all">All Documents</option>
              <option value="expiring_soon">Expiring Soon (Within 30 Days)</option>
              <option value="expired">Expired (Urgent Renewal)</option>
              <option value="valid">Valid Compliance</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Vehicle Documents Table */}
      {activeTab === 'vehicle' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Vehicle</th>
                  <th className="py-3 px-3">Document Type</th>
                  <th className="py-3 px-3">Certificate / Policy #</th>
                  <th className="py-3 px-3">Issuing Authority / Insurer</th>
                  <th className="py-3 px-3">Issue Date</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3 text-right">Renewal Cost</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block">{doc.vehicleReg}</span>
                      <span className="text-[11px] text-slate-500">{doc.vehicleName}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                        {doc.docType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{doc.docNumber}</td>
                    <td className="py-3 px-3 text-slate-700">{doc.issuingAuthority}</td>
                    <td className="py-3 px-3 text-slate-500">{doc.issueDate}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <span>{doc.expiryDate}</span>
                      {doc.daysRemaining !== undefined && (
                        <span className={`block text-[10px] ${doc.daysRemaining <= 0 ? 'text-rose-600 font-bold' : doc.daysRemaining <= 30 ? 'text-amber-600 font-bold' : 'text-slate-400'}`}>
                          {doc.daysRemaining <= 0 ? `Expired ${Math.abs(doc.daysRemaining)} days ago` : `${doc.daysRemaining} days remaining`}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700">{formatINR(doc.renewalCost)}</td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={doc.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Driver Licences Table */}
      {activeTab === 'driver' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Driver Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">DL Number</th>
                  <th className="py-3 px-3">DL Expiry Date</th>
                  <th className="py-3 px-3">Days Remaining</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {driverLicences.map((dl) => (
                  <tr key={dl.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{dl.driverName}</td>
                    <td className="py-3 px-3 text-slate-600">{dl.driverPhone}</td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">{dl.docNumber}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{dl.expiryDate}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {dl.daysRemaining <= 0 ? (
                        <span className="text-rose-600 font-bold">Expired</span>
                      ) : (
                        <span>{dl.daysRemaining} days</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={dl.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Vehicle Compliance Document"
        subtitle="Track RTO Certificate, Insurance, Fitness, Permit, or Road Tax"
        maxWidth="lg"
      >
        <form onSubmit={handleAddDocument} className="space-y-4">
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
                Document Type *
              </label>
              <select
                value={formData.docType}
                onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="insurance">Comprehensive Insurance</option>
                <option value="fitness">Fitness Certificate (FC)</option>
                <option value="puc">Pollution Certificate (PUC)</option>
                <option value="permit">Goods Permit (State/National)</option>
                <option value="road_tax">Road Tax</option>
                <option value="rc">Registration Certificate (RC)</option>
                <option value="other">Other Compliance Certificate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Document / Policy Number *
              </label>
              <input
                type="text"
                required
                value={formData.docNumber}
                onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                placeholder="e.g. TATA-AIG-CV-2026-99218"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Issuing Authority / Insurer
              </label>
              <input
                type="text"
                value={formData.issuingAuthority}
                onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                placeholder="e.g. Tata AIG / RTO Bhubaneswar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Renewal Cost (₹)
              </label>
              <input
                type="number"
                value={formData.renewalCost}
                onChange={(e) => setFormData({ ...formData, renewalCost: e.target.value })}
                placeholder="18500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
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
              Add Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
