'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Wrench,
  Fuel,
  Navigation2,
  Calendar,
  AlertTriangle,
  FileCheck2,
  TrendingUp,
  Receipt,
  Eye,
  IndianRupee,
  Shield,
  Pencil,
  Gauge,
  Trash2,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatDateIST } from '@/lib/accounting';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add Vehicle Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    regNumber: '',
    name: '',
    manufacturer: 'Mahindra',
    model: '',
    vehicleType: 'Pickup Truck',
    fuelType: 'Diesel',
    currentOdometer: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: '',
    financer: '',
    loanAmount: '',
    emiAmount: '',
    assignedDriverId: '',
    notes: '',
  });

  // Edit Vehicle & Odometer Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: '',
    regNumber: '',
    name: '',
    manufacturer: 'Mahindra',
    model: '',
    vehicleType: 'Pickup Truck',
    fuelType: 'Diesel',
    currentOdometer: '',
    status: 'active',
    purchaseDate: '',
    purchasePrice: '',
    financer: '',
    loanAmount: '',
    emiAmount: '',
    assignedDriverId: '',
    notes: '',
  });

  const handleOpenEdit = (v: any) => {
    setEditFormData({
      id: v.id,
      regNumber: v.regNumber || '',
      name: v.name || '',
      manufacturer: v.manufacturer || 'Commercial',
      model: v.model || '',
      vehicleType: v.vehicleType || 'Pickup Truck',
      fuelType: v.fuelType || 'Diesel',
      currentOdometer: String(v.currentOdometer ?? 0),
      status: v.status || 'active',
      purchaseDate: v.purchaseDate ? v.purchaseDate.slice(0, 10) : '',
      purchasePrice: v.purchasePrice ? String(v.purchasePrice) : '',
      financer: v.loanDetails?.financer || '',
      loanAmount: v.loanDetails?.totalLoanAmount ? String(v.loanDetails.totalLoanAmount) : '',
      emiAmount: v.loanDetails?.emiAmount ? String(v.loanDetails.emiAmount) : '',
      assignedDriverId: v.assignedDriverId || '',
      notes: v.notes || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.regNumber || !editFormData.name || editFormData.currentOdometer === '') {
      alert('Please fill the mandatory fields: Vehicle Number, Vehicle Name, and Odometer Reading.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/vehicles/${editFormData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          currentOdometer: Number(editFormData.currentOdometer) || 0,
          purchasePrice: Number(editFormData.purchasePrice) || 0,
          loanDetails: editFormData.financer
            ? {
                financer: editFormData.financer,
                totalLoanAmount: Number(editFormData.loanAmount) || 0,
                emiAmount: Number(editFormData.emiAmount) || 0,
              }
            : undefined,
        }),
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchVehicles();
        if (selectedVehicleData && selectedVehicleData.vehicle?.id === editFormData.id) {
          handleOpenProfile(editFormData.id);
        }
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update vehicle');
      }
    } catch {
      alert('Error updating vehicle');
    }
  };

  const handleDeleteVehicle = async (veh: any) => {
    if (!veh) return;
    const confirmed = confirm(
      `Are you sure you want to permanently delete vehicle ${veh.regNumber} (${veh.name || 'Fleet Truck'})?\n\nThis will remove the vehicle from your active fleet and unassign any linked driver.`
    );
    if (!confirmed) return;

    const enteredPin = prompt(
      `🔒 Master Security Verification:\n\nTo delete vehicle ${veh.regNumber}, enter your 6-digit Master Security PIN (or Admin Password):`
    );
    if (!enteredPin) return;

    try {
      const res = await fetch(`/api/admin/vehicles/${veh.id}`, {
        method: 'DELETE',
        headers: {
          'x-security-pin': enteredPin.trim(),
        },
      });
      if (res.ok) {
        alert(`Vehicle ${veh.regNumber} deleted successfully.`);
        if (profileModalOpen) {
          setProfileModalOpen(false);
        }
        if (editModalOpen) {
          setEditModalOpen(false);
        }
        fetchVehicles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete vehicle');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting vehicle');
    }
  };

  // Vehicle Profile Modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedVehicleData, setSelectedVehicleData] = useState<any>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'trips' | 'expenses' | 'documents' | 'maintenance' | 'challans' | 'financials'>('overview');
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/admin/vehicles');
      if (res.ok) {
        const json = await res.json();
        setVehicles(json.vehicles || []);
      }
      const drvRes = await fetch('/api/admin/drivers');
      if (drvRes.ok) {
        const dJson = await drvRes.json();
        setDrivers(dJson.drivers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenProfile = async (id: string) => {
    setProfileLoading(true);
    setProfileModalOpen(true);
    setProfileTab('overview');
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedVehicleData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.regNumber || !formData.name || formData.currentOdometer === '') {
      alert('Please fill the mandatory fields: Vehicle Number, Vehicle Name, and Odometer Reading.');
      return;
    }

    try {
      const res = await fetch('/api/admin/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          loanDetails: formData.financer
            ? {
                financer: formData.financer,
                totalLoanAmount: Number(formData.loanAmount) || 0,
                emiAmount: Number(formData.emiAmount) || 0,
              }
            : undefined,
        }),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setFormData({
          regNumber: '',
          name: '',
          manufacturer: 'Mahindra',
          model: '',
          vehicleType: 'Pickup Truck',
          fuelType: 'Diesel',
          currentOdometer: '',
          purchaseDate: new Date().toISOString().slice(0, 10),
          purchasePrice: '',
          financer: '',
          loanAmount: '',
          emiAmount: '',
          assignedDriverId: '',
          notes: '',
        });
        fetchVehicles();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add vehicle');
      }
    } catch {
      alert('Error adding vehicle');
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.regNumber.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.driverName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Commercial Fleet Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pickup vehicles, specifications, compliance, and individual vehicle profitability
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by registration number, model, or driver..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden"
          >
            <option value="all">All Fleet ({vehicles.length})</option>
            <option value="active">Active Service</option>
            <option value="in_service">Under Maintenance</option>
            <option value="inactive">Inactive / Archived</option>
          </select>
        </div>
      </div>

      {/* Vehicle Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVehicles.map((veh) => (
          <div
            key={veh.id}
            onClick={() => handleOpenProfile(veh.id)}
            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-base font-black text-slate-900 font-mono tracking-tight group-hover:text-blue-600 transition-colors">
                    {veh.regNumber}
                  </span>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    {veh.name} &bull; <span className="text-slate-400">{veh.model}</span>
                  </p>
                </div>
                <StatusBadge status={veh.status} size="sm" />
              </div>

              {/* Specs pill row */}
              <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(veh);
                  }}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group/odo"
                  title="Click to edit current odometer reading"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Odo</span>
                    <Pencil className="w-2.5 h-2.5 text-slate-300 group-hover/odo:text-blue-600 transition-colors" />
                  </div>
                  <span className="font-bold text-slate-800 group-hover/odo:text-blue-700 font-mono transition-colors">
                    {veh.currentOdometer.toLocaleString()} km
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Fuel Type</span>
                  <span className="font-bold text-slate-800">{veh.fuelType}</span>
                </div>
              </div>

              {/* Driver & Compliance line */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Driver:</span>
                  <span className="font-bold text-slate-900">{veh.driverName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trips Completed:</span>
                  <span className="font-semibold text-slate-900">{veh.totalTrips}</span>
                </div>
              </div>
            </div>

            {/* Financial Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Operating Profit</span>
                <span className="text-sm font-black text-emerald-700">{formatINR(veh.profit)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(veh);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Edit vehicle details or change odometer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Edit / Odo</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVehicle(veh);
                  }}
                  className="p-1 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                  title="Delete vehicle from fleet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Profile</span>
                  <Eye className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredVehicles.length === 0 && !loading && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No vehicles matching your search.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the filter or click Add New Vehicle.</p>
        </div>
      )}

      {/* Add Vehicle Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Commercial Fleet Vehicle"
        subtitle="Register a new pickup vehicle, mini truck, or delivery carrier"
        maxWidth="xl"
      >
        <form onSubmit={handleAddVehicle} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Number *
              </label>
              <input
                type="text"
                required
                value={formData.regNumber}
                onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                placeholder="e.g. OD 02 AK 4589"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Bolero Maxi Truck Plus"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Manufacturer
              </label>
              <select
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="Mahindra">Mahindra</option>
                <option value="Tata Motors">Tata Motors</option>
                <option value="Ashok Leyland">Ashok Leyland</option>
                <option value="Isuzu">Isuzu</option>
                <option value="Eicher">Eicher</option>
                <option value="Maruti Suzuki">Maruti Suzuki</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Model
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. Maxi Truck 1.2T"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fuel Type
              </label>
              <select
                value={formData.fuelType}
                onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="Electric">Electric</option>
                <option value="Petrol">Petrol</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Odometer Reading (km) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.currentOdometer}
                onChange={(e) => setFormData({ ...formData, currentOdometer: e.target.value })}
                placeholder="e.g. 48000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Primary Driver
              </label>
              <select
                value={formData.assignedDriverId}
                onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No driver assigned --</option>
                {drivers
                  .filter((d) => d.accountStatus === 'approved')
                  .map((drv) => (
                    <option key={drv.id} value={drv.id}>
                      {drv.fullName} ({drv.phone})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Purchase Price (₹)
              </label>
              <input
                type="number"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                placeholder="780000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Loan Financer
              </label>
              <input
                type="text"
                value={formData.financer}
                onChange={(e) => setFormData({ ...formData, financer: e.target.value })}
                placeholder="e.g. Mahindra Finance / HDFC"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Monthly EMI (₹)
              </label>
              <input
                type="number"
                value={formData.emiAmount}
                onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
                placeholder="14200"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Operational details, route preferences, or condition remarks..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
            >
              Add Vehicle
            </button>
          </div>
        </form>
      </Modal>

      {/* Full Vehicle Profile Modal with 7 Tabs */}
      <Modal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        title={selectedVehicleData ? `${selectedVehicleData.vehicle.regNumber} — ${selectedVehicleData.vehicle.name}` : 'Vehicle Profile'}
        subtitle="Complete operational, compliance, and financial records"
        maxWidth="3xl"
      >
        {profileLoading || !selectedVehicleData ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading vehicle records...</div>
        ) : (
          <div className="space-y-4">
            {/* Navigation Tabs with Edit Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'trips', label: `Trips (${selectedVehicleData.trips?.length || 0})` },
                  { id: 'expenses', label: `Expenses (${selectedVehicleData.expenses?.length || 0})` },
                  { id: 'documents', label: `Compliance (${selectedVehicleData.documents?.length || 0})` },
                  { id: 'maintenance', label: `Maintenance (${selectedVehicleData.maintenance?.length || 0})` },
                  { id: 'challans', label: `Challans (${selectedVehicleData.challans?.length || 0})` },
                  { id: 'financials', label: 'Financial Summary' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setProfileTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                      profileTab === tab.id
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedVehicleData.vehicle)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                  title="Edit vehicle details or change odometer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit / Update Odometer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteVehicle(selectedVehicleData.vehicle)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                  title="Delete this vehicle"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>

            {/* Tab 1: Overview */}
            {profileTab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Make & Model</span>
                    <span className="font-bold text-slate-900">{selectedVehicleData.vehicle.manufacturer} {selectedVehicleData.vehicle.model}</span>
                  </div>
                  <div 
                    onClick={() => handleOpenEdit(selectedVehicleData.vehicle)}
                    className="p-3 bg-slate-50 hover:bg-blue-50/70 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group/odo"
                    title="Click to edit current odometer reading"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Odometer</span>
                      <Pencil className="w-2.5 h-2.5 text-slate-400 group-hover/odo:text-blue-600 transition-colors" />
                    </div>
                    <span className="font-bold text-slate-900 group-hover/odo:text-blue-700 font-mono transition-colors">
                      {selectedVehicleData.vehicle.currentOdometer.toLocaleString()} km
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
                    <StatusBadge status={selectedVehicleData.vehicle.status} size="sm" />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Assigned Driver</span>
                    <span className="font-bold text-slate-900">{selectedVehicleData.assignedDriver?.fullName || 'Unassigned'}</span>
                  </div>
                </div>

                {selectedVehicleData.vehicle.loanDetails?.financer && (
                  <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900">
                    <p className="font-bold text-blue-950 mb-1">Vehicle Loan & Financing Details</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>Financer: <b>{selectedVehicleData.vehicle.loanDetails.financer}</b></div>
                      <div>Monthly EMI: <b>{formatINR(selectedVehicleData.vehicle.loanDetails.emiAmount)}</b></div>
                      <div>Loan Amount: <b>{formatINR(selectedVehicleData.vehicle.loanDetails.totalLoanAmount)}</b></div>
                    </div>
                  </div>
                )}

                {selectedVehicleData.vehicle.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                    <span className="font-bold text-slate-800 block mb-0.5">Vehicle Remarks:</span>
                    {selectedVehicleData.vehicle.notes}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Trips */}
            {profileTab === 'trips' && (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Trip #</th>
                      <th className="p-2">Customer</th>
                      <th className="p-2">Route</th>
                      <th className="p-2 text-right">Freight</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVehicleData.trips?.map((t: any) => (
                      <tr key={t.id}>
                        <td className="p-2 font-mono font-bold text-blue-700">{t.tripNumber}</td>
                        <td className="p-2 font-semibold text-slate-800">{t.customerName}</td>
                        <td className="p-2 text-slate-600">{t.loadingLocation} &rarr; {t.deliveryLocation}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{formatINR(t.freightAmount)}</td>
                        <td className="p-2 text-center"><StatusBadge status={t.tripStatus} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Expenses */}
            {profileTab === 'expenses' && (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVehicleData.expenses?.map((e: any) => (
                      <tr key={e.id}>
                        <td className="p-2 text-slate-500">{e.expenseDate}</td>
                        <td className="p-2 font-bold uppercase text-[10px] text-slate-700">{e.category.replace(/_/g, ' ')}</td>
                        <td className="p-2 text-slate-600">{e.description}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{formatINR(e.amount)}</td>
                        <td className="p-2 text-center"><StatusBadge status={e.approvalStatus} size="sm" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: Documents */}
            {profileTab === 'documents' && (
              <div className="space-y-2">
                {selectedVehicleData.documents?.map((doc: any) => (
                  <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold uppercase text-slate-900 block">{doc.docType} &bull; {doc.docNumber}</span>
                      <span className="text-slate-500">Authority: {doc.issuingAuthority} &bull; Expiry: {doc.expiryDate}</span>
                    </div>
                    <StatusBadge status={doc.status} size="sm" />
                  </div>
                ))}
              </div>
            )}

            {/* Tab 5: Maintenance */}
            {profileTab === 'maintenance' && (
              <div className="space-y-2">
                {selectedVehicleData.maintenance?.map((m: any) => (
                  <div key={m.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 uppercase">{m.serviceType} at {m.workshopName}</span>
                      <span className="font-bold text-slate-900">{formatINR(m.totalCost)}</span>
                    </div>
                    <p className="text-slate-500">Date: {m.serviceDate} &bull; Odo: {m.odometerReading} km</p>
                    <p className="text-slate-600">Parts: {m.partsReplaced}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 6: Challans */}
            {profileTab === 'challans' && (
              <div className="space-y-2">
                {selectedVehicleData.challans?.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">Challan #{c.challanNumber}</span>
                      <p className="text-slate-500">{c.violationDescription}</p>
                      <p className="text-[10px] text-slate-400">Date: {c.challanDate}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-rose-700 block">{formatINR(c.fineAmount)}</span>
                      <StatusBadge status={c.paymentStatus} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 7: Financial Summary */}
            {profileTab === 'financials' && (
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-4 text-xs">
                <h4 className="font-bold text-blue-400 text-sm">Vehicle Profitability Statement</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Freight Billed</span>
                    <span className="font-black text-white text-base">{formatINR(selectedVehicleData.financials?.totalFreight)}</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Operating Expenses</span>
                    <span className="font-black text-amber-400 text-base">{formatINR(selectedVehicleData.financials?.totalExpenses)}</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Operating Profit</span>
                    <span className="font-black text-emerald-400 text-base">{formatINR(selectedVehicleData.financials?.netProfit)}</span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Operating Margin</span>
                    <span className="font-black text-emerald-400 text-base">{selectedVehicleData.financials?.profitMargin}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Vehicle & Odometer Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editFormData.regNumber ? `Edit Vehicle: ${editFormData.regNumber}` : 'Edit Vehicle Details'}
        subtitle="Update vehicle specifications, assigned driver, and current odometer reading"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Registration Number *
              </label>
              <input
                type="text"
                required
                value={editFormData.regNumber}
                onChange={(e) => setEditFormData({ ...editFormData, regNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Name *
              </label>
              <input
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ODOMETER HIGHLIGHT BOX */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 space-y-1.5">
            <label className="block text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600" />
              <span>Current Odometer Reading (KM) *</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={editFormData.currentOdometer}
              onChange={(e) => setEditFormData({ ...editFormData, currentOdometer: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-base font-mono font-black text-slate-900 focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              💡 You can manually adjust this reading anytime here. It also automatically updates whenever any delivery trip is marked as completed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Status
              </label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active (Available)</option>
                <option value="in_service">In Service / Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Driver
              </label>
              <select
                value={editFormData.assignedDriverId}
                onChange={(e) => setEditFormData({ ...editFormData, assignedDriverId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No Driver Assigned --</option>
                {drivers
                  .filter((d) => d.accountStatus === 'approved')
                  .map((drv) => (
                    <option key={drv.id} value={drv.id}>
                      {drv.fullName} ({drv.phone})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Fuel Type
              </label>
              <select
                value={editFormData.fuelType}
                onChange={(e) => setEditFormData({ ...editFormData, fuelType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="Diesel">Diesel</option>
                <option value="CNG">CNG</option>
                <option value="Petrol">Petrol</option>
                <option value="Electric">Electric</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Manufacturer
              </label>
              <input
                type="text"
                value={editFormData.manufacturer}
                onChange={(e) => setEditFormData({ ...editFormData, manufacturer: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Model
              </label>
              <input
                type="text"
                value={editFormData.model}
                onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Body / Vehicle Type
              </label>
              <input
                type="text"
                value={editFormData.vehicleType}
                onChange={(e) => setEditFormData({ ...editFormData, vehicleType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Purchase Price (₹)
              </label>
              <input
                type="number"
                value={editFormData.purchasePrice}
                onChange={(e) => setEditFormData({ ...editFormData, purchasePrice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Loan Financer
              </label>
              <input
                type="text"
                value={editFormData.financer}
                onChange={(e) => setEditFormData({ ...editFormData, financer: e.target.value })}
                placeholder="e.g. Mahindra Finance / HDFC"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Monthly EMI (₹)
              </label>
              <input
                type="number"
                value={editFormData.emiAmount}
                onChange={(e) => setEditFormData({ ...editFormData, emiAmount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Internal Remarks & Notes
            </label>
            <textarea
              rows={2}
              value={editFormData.notes}
              onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleDeleteVehicle(editFormData)}
              className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Vehicle</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
              >
                Save Changes & Update Odometer
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
