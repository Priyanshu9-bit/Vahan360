'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Truck,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  IndianRupee,
  Toolbox,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { formatINR } from '@/lib/accounting';

export default function MaintenancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceDate: new Date().toISOString().slice(0, 10),
    odometerReading: '',
    serviceType: 'periodic',
    workshopName: '',
    mechanicName: '',
    partsReplaced: '',
    partsCost: '',
    labourCost: '',
    nextServiceDate: '',
    nextServiceOdometer: '',
    notes: '',
  });

  const fetchMaintenance = async () => {
    try {
      const res = await fetch('/api/admin/maintenance');
      if (res.ok) {
        const json = await res.json();
        setRecords(json.maintenanceRecords || []);
      }
      const vehRes = await fetch('/api/admin/vehicles');
      if (vehRes.ok) {
        const vJson = await vehRes.json();
        setVehicles(vJson.vehicles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.serviceType || !formData.workshopName) {
      alert('Please fill mandatory fields.');
      return;
    }

    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setFormData({
          vehicleId: '',
          serviceDate: new Date().toISOString().slice(0, 10),
          odometerReading: '',
          serviceType: 'periodic',
          workshopName: '',
          mechanicName: '',
          partsReplaced: '',
          partsCost: '',
          labourCost: '',
          nextServiceDate: '',
          nextServiceOdometer: '',
          notes: '',
        });
        fetchMaintenance();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record maintenance');
      }
    } catch {
      alert('Error recording maintenance');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Vehicle Maintenance & Workshop Logs
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tracking periodic servicing, oil changes, tyre replacements, parts, and labour charges
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Record Workshop Service</span>
        </button>
      </div>

      {/* Maintenance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Service Date</th>
                <th className="py-3 px-3">Vehicle</th>
                <th className="py-3 px-3">Service Type</th>
                <th className="py-3 px-3">Workshop & Mechanic</th>
                <th className="py-3 px-3">Parts Replaced</th>
                <th className="py-3 px-3 text-right">Parts Cost</th>
                <th className="py-3 px-3 text-right">Labour</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900">Total Cost</th>
                <th className="py-3 px-3">Next Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-700">{m.serviceDate}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{m.vehicleReg}</span>
                    <span className="text-[11px] text-slate-500">{m.odometerReading} km</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {m.serviceType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-800 block">{m.workshopName}</span>
                    {m.mechanicName && <span className="text-[11px] text-slate-500">Tech: {m.mechanicName}</span>}
                  </td>
                  <td className="py-3 px-3 text-slate-600 max-w-xs truncate">{m.partsReplaced || 'General checkup'}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">{formatINR(m.partsCost)}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">{formatINR(m.labourCost)}</td>
                  <td className="py-3 px-3 text-right font-black text-slate-900">{formatINR(m.totalCost)}</td>
                  <td className="py-3 px-3 text-[11px] text-slate-500">
                    {m.nextServiceDate ? `By: ${m.nextServiceDate}` : ''}
                    {m.nextServiceOdometer ? ` (${m.nextServiceOdometer} km)` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Maintenance Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Record Vehicle Service & Maintenance"
        subtitle="Log workshop servicing, oil change, tyre, or repairs"
        maxWidth="lg"
      >
        <form onSubmit={handleAddMaintenance} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Fleet Vehicle *
              </label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => {
                  const veh = vehicles.find((v) => v.id === e.target.value);
                  setFormData({
                    ...formData,
                    vehicleId: e.target.value,
                    odometerReading: veh ? String(veh.currentOdometer) : formData.odometerReading,
                  });
                }}
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
                Service Type *
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="periodic">Periodic Comprehensive Service</option>
                <option value="oil_change">Engine Oil & Filters Change</option>
                <option value="tyre">Tyre Replacement / Rotation</option>
                <option value="brakes_clutch">Brakes & Clutch Overhaul</option>
                <option value="battery">Battery Check / Replacement</option>
                <option value="repair">Mechanical Repair</option>
                <option value="other">Other Maintenance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Service Date *
              </label>
              <input
                type="date"
                required
                value={formData.serviceDate}
                onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Odometer at Service (km)
              </label>
              <input
                type="number"
                value={formData.odometerReading}
                onChange={(e) => setFormData({ ...formData, odometerReading: e.target.value })}
                placeholder="48650"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Garage / Workshop Name *
              </label>
              <input
                type="text"
                required
                value={formData.workshopName}
                onChange={(e) => setFormData({ ...formData, workshopName: e.target.value })}
                placeholder="e.g. Authorized Mahindra Service / Cuttack Truck Garage"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mechanic / Advisor Name
              </label>
              <input
                type="text"
                value={formData.mechanicName}
                onChange={(e) => setFormData({ ...formData, mechanicName: e.target.value })}
                placeholder="e.g. Master Sanjeev"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Parts Replaced / Work Description
            </label>
            <input
              type="text"
              value={formData.partsReplaced}
              onChange={(e) => setFormData({ ...formData, partsReplaced: e.target.value })}
              placeholder="e.g. Engine Oil 7.5L, Oil Filter, Brake Pads"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Parts Cost (₹)
              </label>
              <input
                type="number"
                value={formData.partsCost}
                onChange={(e) => setFormData({ ...formData, partsCost: e.target.value })}
                placeholder="3500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Labour Charges (₹)
              </label>
              <input
                type="number"
                value={formData.labourCost}
                onChange={(e) => setFormData({ ...formData, labourCost: e.target.value })}
                placeholder="1200"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Next Service Due Date
              </label>
              <input
                type="date"
                value={formData.nextServiceDate}
                onChange={(e) => setFormData({ ...formData, nextServiceDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Next Service Odometer (km)
              </label>
              <input
                type="number"
                value={formData.nextServiceOdometer}
                onChange={(e) => setFormData({ ...formData, nextServiceOdometer: e.target.value })}
                placeholder="55000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
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
              Record Maintenance
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
