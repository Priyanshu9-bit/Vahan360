'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  CreditCard,
  Phone,
  Truck,
  Check,
  X,
  AlertTriangle,
  UserCheck,
  UserX,
  Ban,
  FileText,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Building,
  Trash2,
  UserMinus,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR } from '@/lib/accounting';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState('');

  // Add Driver Modal (Direct Admin Creation)
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    address: '',
    dlNumber: '',
    dlExpiryDate: '',
    emergencyContact: '',
    emergencyPhone: '',
    salaryType: 'monthly',
    agreedSalary: '18000',
    assignedVehicleId: '',
    notes: '',
  });

  // Review Application & Set Salary Modal (For Driver Signups)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [reviewForm, setReviewForm] = useState({
    agreedSalary: '',
    salaryType: 'monthly',
    assignedVehicleId: '',
    notes: '',
  });

  // Remove Driver Pre-Confirmation Modal
  const [removeModalOpen, setRemoveModalOpen] = useState(false);
  const [driverToRemove, setDriverToRemove] = useState<any>(null);
  const [settlementDetails, setSettlementDetails] = useState<any>(null);
  const [loadingSettlement, setLoadingSettlement] = useState(false);
  const [removingDriver, setRemovingDriver] = useState(false);

  const openRemoveModal = async (driver: any) => {
    setDriverToRemove(driver);
    setSettlementDetails(driver.settlementSummary || null);
    setRemoveModalOpen(true);
    setLoadingSettlement(true);
    try {
      const res = await fetch(`/api/admin/drivers/${driver.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.settlementSummary) {
          setSettlementDetails(json.settlementSummary);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSettlement(false);
    }
  };

  const handleConfirmRemoveDriver = async () => {
    if (!driverToRemove) return;
    setRemovingDriver(true);
    try {
      const res = await fetch(`/api/admin/drivers/${driverToRemove.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRemoveModalOpen(false);
        setActionMessage(`Driver ${driverToRemove.fullName} has been removed from the fleet.`);
        setTimeout(() => setActionMessage(''), 5000);
        fetchDrivers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to remove driver');
      }
    } catch {
      alert('Error removing driver');
    } finally {
      setRemovingDriver(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/admin/drivers');
      if (res.ok) {
        const json = await res.json();
        setDrivers(json.drivers || []);
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
    fetchDrivers();
  }, []);

  const handleStatusChange = async (driverId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountStatus: newStatus }),
      });
      if (res.ok) {
        setActionMessage(`Driver status successfully updated to ${newStatus}.`);
        setTimeout(() => setActionMessage(''), 4000);
        fetchDrivers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVehicleAssign = async (driverId: string, assignedVehicleId: string) => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedVehicleId }),
      });
      if (res.ok) {
        fetchDrivers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openReviewModal = (driver: any) => {
    setSelectedDriver(driver);
    setReviewForm({
      agreedSalary: driver.agreedSalary > 0 ? String(driver.agreedSalary) : '',
      salaryType: driver.salaryType || 'monthly',
      assignedVehicleId: driver.assignedVehicleId || '',
      notes: driver.notes || '',
    });
    setReviewModalOpen(true);
  };

  const handleApproveWithTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;

    if (!reviewForm.agreedSalary || Number(reviewForm.agreedSalary) <= 0) {
      alert('Please enter the agreed salary amount for this driver.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/drivers/${selectedDriver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountStatus: 'approved',
          agreedSalary: Number(reviewForm.agreedSalary),
          salaryType: reviewForm.salaryType,
          assignedVehicleId: reviewForm.assignedVehicleId || undefined,
          notes: reviewForm.notes,
        }),
      });

      if (res.ok) {
        setReviewModalOpen(false);
        setActionMessage(
          `Driver ${selectedDriver.fullName} approved with agreed salary of ${formatINR(Number(reviewForm.agreedSalary))} / mo.`
        );
        setTimeout(() => setActionMessage(''), 4000);
        fetchDrivers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to approve driver');
      }
    } catch {
      alert('Error approving driver application');
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.dlNumber || !formData.dlExpiryDate) {
      alert('Please fill all mandatory driver fields.');
      return;
    }

    try {
      const res = await fetch('/api/admin/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setAddModalOpen(false);
        setFormData({
          fullName: '',
          phone: '',
          email: '',
          password: '',
          address: '',
          dlNumber: '',
          dlExpiryDate: '',
          emergencyContact: '',
          emergencyPhone: '',
          salaryType: 'monthly',
          agreedSalary: '18000',
          assignedVehicleId: '',
          notes: '',
        });
        setActionMessage('New driver registered and approved successfully.');
        setTimeout(() => setActionMessage(''), 4000);
        fetchDrivers();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add driver');
      }
    } catch {
      alert('Error adding driver');
    }
  };

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch =
      d.fullName.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      d.dlNumber.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = drivers.filter((d) => d.accountStatus === 'pending_approval').length;
  const approvedCount = drivers.filter((d) => d.accountStatus === 'approved').length;
  const resignedCount = drivers.filter((d) => d.accountStatus === 'resigned').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Commercial Driver Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Driver roster, license verification, salary terms, and application review
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Driver Directly</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Drivers</span>
          <span className="text-xl font-black text-slate-900 mt-1 block">{drivers.length}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Approved & Active</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">{approvedCount}</span>
        </div>
        <div className={`rounded-2xl p-4 border shadow-xs transition-all ${
          pendingCount > 0 ? 'bg-amber-500/10 border-amber-300 ring-2 ring-amber-400/20' : 'bg-white border-slate-200'
        }`}>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Pending Applications</span>
          <span className="text-xl font-black text-amber-600 mt-1 block">{pendingCount}</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resigned / Quitted</span>
          <span className="text-xl font-black text-orange-600 mt-1 block">{resignedCount}</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, DL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-hidden"
          >
            <option value="all">All Drivers ({drivers.length})</option>
            <option value="approved">Approved ({approvedCount})</option>
            <option value="pending_approval">Pending Applications ({pendingCount})</option>
            <option value="resigned">Resigned ({resignedCount})</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Driver Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredDrivers.map((drv) => (
          <div
            key={drv.id}
            className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-xs ${
              drv.accountStatus === 'pending_approval'
                ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/20'
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
                    {drv.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{drv.fullName}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{drv.phone}</span>
                    </p>
                  </div>
                </div>
                <StatusBadge status={drv.accountStatus} size="sm" />
              </div>

              {/* DL Compliance Row */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 my-3 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Driving Licence</span>
                  <span className="font-mono font-bold text-slate-800">{drv.dlNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">DL Expiry</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">{drv.dlExpiryDate}</span>
                    <StatusBadge status={drv.dlStatus} size="sm" />
                  </div>
                </div>
              </div>

              {/* Vehicle Assignment & Terms */}
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Assigned Vehicle
                  </label>
                  <select
                    value={drv.assignedVehicleId || ''}
                    onChange={(e) => handleVehicleAssign(drv.id, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="">-- No vehicle assigned --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNumber} ({v.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-500 font-medium">Agreed Salary:</span>
                  {drv.agreedSalary > 0 ? (
                    <span className="font-bold text-slate-900">{formatINR(drv.agreedSalary)} / mo</span>
                  ) : (
                    <span className="text-amber-700 font-bold bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded text-[10px]">
                      Pending Owner Review
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Trips Completed:</span>
                  <span className="font-bold text-slate-900">{drv.completedTrips || 0}</span>
                </div>
                <div className="flex items-center justify-between pt-0.5 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Pending Settlement:</span>
                  <span className={`font-bold ${
                    (drv.settlementSummary?.netPendingAmount || 0) > 0
                      ? 'text-emerald-700'
                      : (drv.settlementSummary?.netPendingAmount || 0) < 0
                      ? 'text-amber-700'
                      : 'text-slate-500'
                  }`}>
                    {formatINR(drv.settlementSummary?.netPendingAmount || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              {drv.accountStatus === 'pending_approval' ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => openReviewModal(drv)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Review & Set Terms</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Reject registration for ${drv.fullName}?`)) {
                        handleStatusChange(drv.id, 'rejected');
                      }
                    }}
                    className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 cursor-pointer"
                    title="Reject Application"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openRemoveModal(drv)}
                    className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
                    title="Remove Driver"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              ) : drv.accountStatus === 'approved' ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => openReviewModal(drv)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Edit Terms</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange(drv.id, 'suspended')}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
                    title="Suspend Driver Account"
                  >
                    <Ban className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openRemoveModal(drv)}
                    className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-all border border-slate-200 cursor-pointer flex items-center gap-1"
                    title="Remove Driver"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span className="hidden sm:inline text-[11px]">Remove</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => openReviewModal(drv)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-emerald-200 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Reactivate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openRemoveModal(drv)}
                    className="py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 cursor-pointer flex items-center gap-1"
                    title="Remove Driver"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Driver Application & Set Salary Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Review Driver Application & Set Terms"
        subtitle="Review driver credentials, assign agreed compensation, and grant operational access"
        maxWidth="lg"
      >
        {selectedDriver && (
          <form onSubmit={handleApproveWithTerms} className="space-y-5">
            {/* Driver Profile Summary Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{selectedDriver.fullName}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                    <span>📱 {selectedDriver.phone}</span>
                    {selectedDriver.email && <span>📧 {selectedDriver.email}</span>}
                  </p>
                </div>
                <StatusBadge status={selectedDriver.accountStatus} size="sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Driving Licence (DL)</span>
                  <span className="font-mono font-bold text-slate-800 text-sm">{selectedDriver.dlNumber}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-slate-500">Expires: {selectedDriver.dlExpiryDate}</span>
                    <StatusBadge status={selectedDriver.dlStatus} size="sm" />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Emergency Contact</span>
                  <span className="font-semibold text-slate-800">{selectedDriver.emergencyContact || 'None provided'}</span>
                  {selectedDriver.emergencyPhone && (
                    <span className="text-[11px] text-slate-500 block">Phone: {selectedDriver.emergencyPhone}</span>
                  )}
                </div>

                {selectedDriver.address && (
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Residential Address</span>
                    <span className="text-slate-700">{selectedDriver.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Compensation & Fleet Assignment Section */}
            <div className="space-y-4 pt-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Owner Review: Set Agreed Compensation & Vehicle</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Agreed Salary Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={reviewForm.agreedSalary}
                    onChange={(e) => setReviewForm({ ...reviewForm, agreedSalary: e.target.value })}
                    placeholder="e.g. 18000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Set the exact compensation agreed with the driver.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Salary Payment Structure
                  </label>
                  <select
                    value={reviewForm.salaryType}
                    onChange={(e) => setReviewForm({ ...reviewForm, salaryType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly Fixed Salary</option>
                    <option value="per_trip">Per-Trip Payment</option>
                    <option value="daily">Daily Wages</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign Commercial Fleet Vehicle
                  </label>
                  <select
                    value={reviewForm.assignedVehicleId}
                    onChange={(e) => setReviewForm({ ...reviewForm, assignedVehicleId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- No vehicle assigned right now (Can assign later) --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNumber} — {v.manufacturer} {v.name} ({v.currentOdometer?.toLocaleString()} km)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Owner Approval Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={reviewForm.notes}
                    onChange={(e) => setReviewForm({ ...reviewForm, notes: e.target.value })}
                    placeholder="e.g. DL verified, experienced in intercity routes, phone verified"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Reject driver application for ${selectedDriver.fullName}?`)) {
                    handleStatusChange(selectedDriver.id, 'rejected');
                    setReviewModalOpen(false);
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 cursor-pointer"
              >
                Reject Application
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve Driver & Confirm Terms</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Driver Directly Modal (Admin Manual Entry) */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add & Register Commercial Driver"
        subtitle="Create driver profile and credentials with immediate approval"
        maxWidth="xl"
      >
        <form onSubmit={handleAddDriver} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Driver Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Rajesh Kumar Sahoo"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="driver@transport.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Temporary Password *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Password for driver login"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Driving Licence Number *
              </label>
              <input
                type="text"
                required
                value={formData.dlNumber}
                onChange={(e) => setFormData({ ...formData, dlNumber: e.target.value })}
                placeholder="e.g. OD02-20180029182"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Licence Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.dlExpiryDate}
                onChange={(e) => setFormData({ ...formData, dlExpiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agreed Salary (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.agreedSalary}
                onChange={(e) => setFormData({ ...formData, agreedSalary: e.target.value })}
                placeholder="18000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Salary Type
              </label>
              <select
                value={formData.salaryType}
                onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly Salary</option>
                <option value="per_trip">Per-Trip Payment</option>
                <option value="daily">Daily Wages</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assign Primary Commercial Vehicle
            </label>
            <select
              value={formData.assignedVehicleId}
              onChange={(e) => setFormData({ ...formData, assignedVehicleId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- No vehicle assigned (Assign later) --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.regNumber} ({v.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Emergency Contact Name
              </label>
              <input
                type="text"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                placeholder="Spouse / Parent / Relative"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Emergency Phone Number
              </label>
              <input
                type="tel"
                value={formData.emergencyPhone}
                onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                placeholder="10-digit number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Residential Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="City, District, State"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
            >
              Register & Approve Driver
            </button>
          </div>
        </form>
      </Modal>

      {/* Remove Driver Pre-Confirmation Modal */}
      <Modal
        isOpen={removeModalOpen}
        onClose={() => setRemoveModalOpen(false)}
        title="Remove Driver & Settlement Review"
        subtitle="Review all pending financial dues, salary balances, and vehicle allocations before confirming driver removal"
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Driver Profile Header */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 font-bold flex items-center justify-center text-sm">
                {driverToRemove?.fullName?.charAt(0) || 'D'}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{driverToRemove?.fullName}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {driverToRemove?.phone}</span>
                  <span>&bull;</span>
                  <span className="font-mono">{driverToRemove?.dlNumber}</span>
                </p>
              </div>
            </div>
            {driverToRemove && <StatusBadge status={driverToRemove.accountStatus} size="sm" />}
          </div>

          {/* Pending Amount & Financial Settlement Breakdown */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800">Pending Financial Dues & Settlement</span>
              {loadingSettlement ? (
                <span className="text-[10px] text-blue-600 animate-pulse font-semibold">Calculating dues...</span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  Verified Calculation
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Pending Unpaid Salary Balance:</span>
                <span className="font-bold text-slate-900">{formatINR(settlementDetails?.unpaidSalaryDue || 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Approved Expense Reimbursements:</span>
                <span className="font-bold text-emerald-700">+{formatINR(settlementDetails?.approvedUnpaidExpenses || 0)}</span>
              </div>
              {Number(settlementDetails?.pendingExpenseClaims) > 0 && (
                <div className="flex items-center justify-between text-amber-800">
                  <span>Expenses Awaiting Approval:</span>
                  <span className="font-semibold">{formatINR(settlementDetails?.pendingExpenseClaims)}</span>
                </div>
              )}
              {Number(settlementDetails?.unreconciledAdvances) > 0 && (
                <div className="flex items-center justify-between text-rose-700">
                  <span>Unreconciled Advances to Recover:</span>
                  <span className="font-semibold">-{formatINR(settlementDetails?.unreconciledAdvances)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm font-black">
                <span className="text-slate-900">Net Pending Settlement:</span>
                <span className={
                  (settlementDetails?.netPendingAmount || 0) > 0
                    ? 'text-rose-700 font-black text-base'
                    : (settlementDetails?.netPendingAmount || 0) < 0
                    ? 'text-amber-700 font-black text-base'
                    : 'text-emerald-700 font-bold'
                }>
                  {formatINR(settlementDetails?.netPendingAmount || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Pending Amount Warning Banners */}
          {(settlementDetails?.netPendingAmount || 0) > 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">⚠️ Amount Pending for Driver:</span>
                The company owes <b>{formatINR(settlementDetails?.netPendingAmount)}</b> to {driverToRemove?.fullName}. Please verify and settle this balance in Salaries & Disbursements.
              </div>
            </div>
          ) : (settlementDetails?.netPendingAmount || 0) < 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">⚠️ Outstanding Advance Owed to Company:</span>
                Driver {driverToRemove?.fullName} owes <b>{formatINR(Math.abs(settlementDetails?.netPendingAmount))}</b> in un-reconciled advances to the fleet company.
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Zero Financial Dues:</span>
                All salary slips and expense claims have zero pending balance (₹0).
              </div>
            </div>
          )}

          {/* Vehicle Assignment Notice */}
          {driverToRemove?.assignedVehicleId && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Assigned vehicle ({driverToRemove.assignedVehicleReg || 'Assigned Vehicle'}) will be automatically unallocated.</span>
            </div>
          )}

          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
            <b>Warning:</b> Confirming removal will permanently remove this driver from active rosters, revoke their login access, and re-pool any assigned trips back to planned status.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setRemoveModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
            >
              Cancel (Keep Driver)
            </button>
            <button
              type="button"
              disabled={removingDriver}
              onClick={handleConfirmRemoveDriver}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              <span>{removingDriver ? 'Removing...' : 'Confirm & Remove Driver'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
