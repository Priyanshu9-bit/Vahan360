'use client';

import React, { useState, useEffect } from 'react';
import {
  Navigation2,
  Plus,
  Search,
  Filter,
  CreditCard,
  Printer,
  TrendingUp,
  Receipt,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  IndianRupee,
  Truck,
  ArrowRight,
  MessageSquare,
  Gauge,
  Play,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatDateIST, formatDateTimeIST } from '@/lib/accounting';

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Book Trip Modal
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    customerName: '',
    customerId: '',
    customerContactPhone: '',
    loadingLocation: '',
    deliveryLocation: '',
    goodsDescription: '',
    weightKg: '',
    tripStartDate: new Date().toISOString().slice(0, 16),
    expectedDeliveryDate: new Date(Date.now() + 3600000 * 12).toISOString().slice(0, 16),
    odometerStart: '',
    freightAmount: '',
    advanceReceived: '',
    advancePaymentMethod: 'upi',
    advanceTxnRef: '',
    notes: '',
  });

  // Record Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedTripForPayment, setSelectedTripForPayment] = useState<any>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'upi',
    transactionRef: '',
    notes: '',
  });

  // Trip Slip Print Modal
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [selectedTripForSlip, setSelectedTripForSlip] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  // Complete Trip Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTripForComplete, setSelectedTripForComplete] = useState<any>(null);
  const [completeOdometerEnd, setCompleteOdometerEnd] = useState('');
  const [completingTrip, setCompletingTrip] = useState(false);

  // Start Trip Modal
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedTripForStart, setSelectedTripForStart] = useState<any>(null);
  const [startFormData, setStartFormData] = useState({
    vehicleId: '',
    driverId: '',
    odometerStart: '',
    tripStartDate: new Date().toISOString().slice(0, 16),
  });
  const [startingTrip, setStartingTrip] = useState(false);

  const fetchTripsData = async () => {
    try {
      const res = await fetch('/api/admin/trips');
      if (res.ok) {
        const json = await res.json();
        setTrips(json.trips || []);
      }
      const vehRes = await fetch('/api/admin/vehicles');
      if (vehRes.ok) {
        const vJson = await vehRes.json();
        setVehicles(vJson.vehicles || []);
      }
      const drvRes = await fetch('/api/admin/drivers');
      if (drvRes.ok) {
        const dJson = await drvRes.json();
        setDrivers(dJson.drivers || []);
      }
      const custRes = await fetch('/api/admin/customers');
      if (custRes.ok) {
        const cJson = await custRes.json();
        setCustomers(cJson.customers || []);
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
    fetchTripsData();
  }, []);

  const handleBookTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.vehicleId ||
      !formData.driverId ||
      !formData.customerName.trim() ||
      !formData.loadingLocation ||
      !formData.deliveryLocation ||
      !formData.freightAmount
    ) {
      alert('Please fill all mandatory trip details (Vehicle, Driver, Customer Name, Locations, Freight).');
      return;
    }

    try {
      const res = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setBookModalOpen(false);
        setFormData({
          vehicleId: '',
          driverId: '',
          customerName: '',
          customerId: '',
          customerContactPhone: '',
          loadingLocation: '',
          deliveryLocation: '',
          goodsDescription: '',
          weightKg: '',
          tripStartDate: new Date().toISOString().slice(0, 16),
          expectedDeliveryDate: new Date(Date.now() + 3600000 * 12).toISOString().slice(0, 16),
          odometerStart: '',
          freightAmount: '',
          advanceReceived: '',
          advancePaymentMethod: 'upi',
          advanceTxnRef: '',
          notes: '',
        });
        fetchTripsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to book trip');
      }
    } catch {
      alert('Error booking trip');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripForPayment || !paymentFormData.amount) return;

    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTripForPayment.id,
          ...paymentFormData,
        }),
      });

      if (res.ok) {
        setPaymentModalOpen(false);
        setPaymentFormData({
          amount: '',
          paymentDate: new Date().toISOString().slice(0, 10),
          paymentMethod: 'upi',
          transactionRef: '',
          notes: '',
        });
        fetchTripsData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record payment');
      }
    } catch {
      alert('Error recording payment');
    }
  };

  const handleOpenCompleteModal = (trip: any) => {
    setSelectedTripForComplete(trip);
    setCompleteOdometerEnd(trip.odometerEnd ? String(trip.odometerEnd) : '');
    setCompleteModalOpen(true);
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripForComplete) return;
    const endOdo = parseFloat(completeOdometerEnd);
    if (isNaN(endOdo) || endOdo <= 0) {
      alert('Please enter a valid closing odometer reading.');
      return;
    }
    if (selectedTripForComplete.odometerStart && endOdo < selectedTripForComplete.odometerStart) {
      if (
        !confirm(
          `Closing odometer (${endOdo} km) is less than starting odometer (${selectedTripForComplete.odometerStart} km). Are you sure you want to proceed?`
        )
      ) {
        return;
      }
    }
    setCompletingTrip(true);
    try {
      const res = await fetch(`/api/admin/trips/${selectedTripForComplete.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripStatus: 'completed',
          odometerEnd: endOdo,
          actualCompletionDate: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setCompleteModalOpen(false);
        setSelectedTripForComplete(null);
        setCompleteOdometerEnd('');
        await fetchTripsData();
        alert(`Trip completed! Vehicle ${selectedTripForComplete.vehicleReg} odometer updated to ${endOdo} km.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete trip');
      }
    } catch (err) {
      console.error(err);
      alert('Error completing trip');
    } finally {
      setCompletingTrip(false);
    }
  };

  const handleShareWhatsApp = (trip: any) => {
    if (!trip) return;
    const phone = trip.customerContactPhone ? trip.customerContactPhone.replace(/[^0-9]/g, '') : '';
    const text = `*VAHAN360 CONSIGNMENT / BILTY SLIP*
Trip #: ${trip.tripNumber}
Date: ${trip.bookingDate || formatDateIST(trip.createdAt || new Date().toISOString())}
Vehicle: ${trip.vehicleReg}
Driver: ${trip.driverName}
Customer: ${trip.customerName}
Route: ${trip.loadingLocation} -> ${trip.deliveryLocation}
Cargo: ${trip.goodsDescription || 'General Cargo'} ${trip.weightKg ? `(${trip.weightKg} kg)` : ''}
Freight: INR ${Number(trip.freightAmount || 0).toLocaleString('en-IN')}
Advance: INR ${Number(trip.advanceReceived || 0).toLocaleString('en-IN')}
Balance Due: INR ${Number(trip.balanceDue || 0).toLocaleString('en-IN')}
Status: ${trip.tripStatus?.toUpperCase()}
${trip.odometerEnd ? `Closing Odometer: ${trip.odometerEnd} km (Distance: ${trip.distanceKm || 0} km)` : `Starting Odometer: ${trip.odometerStart} km`}

Generated via Vahan360 Fleet Management.`;
    const url = phone.length >= 10
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleOpenStartModal = (trip: any) => {
    setSelectedTripForStart(trip);
    const assignedVeh = vehicles.find((v) => v.id === trip.vehicleId || (v.regNumber && v.regNumber === trip.vehicleReg));
    setStartFormData({
      vehicleId: trip.vehicleId || (assignedVeh?.id || ''),
      driverId: trip.driverId || '',
      odometerStart: trip.odometerStart ? String(trip.odometerStart) : (assignedVeh ? String(assignedVeh.currentOdometer) : ''),
      tripStartDate: new Date().toISOString().slice(0, 16),
    });
    setStartModalOpen(true);
  };

  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripForStart) return;
    if (!startFormData.vehicleId) {
      alert('Please select the vehicle for this trip.');
      return;
    }
    if (!startFormData.driverId) {
      alert('Please select the assigned driver for this trip.');
      return;
    }
    const startOdo = parseFloat(startFormData.odometerStart);
    if (isNaN(startOdo) || startOdo < 0) {
      alert('Please enter a valid starting odometer reading.');
      return;
    }

    setStartingTrip(true);
    try {
      const res = await fetch(`/api/admin/trips/${selectedTripForStart.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripStatus: 'in_progress',
          vehicleId: startFormData.vehicleId,
          driverId: startFormData.driverId,
          odometerStart: startOdo,
          tripStartDate: startFormData.tripStartDate || new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setStartModalOpen(false);
        setSelectedTripForStart(null);
        await fetchTripsData();
        const drv = drivers.find((d) => d.id === startFormData.driverId);
        const veh = vehicles.find((v) => v.id === startFormData.vehicleId);
        alert(`Trip ${selectedTripForStart.tripNumber} started successfully!\nVehicle: ${veh?.regNumber || 'Assigned Truck'}\nDriver: ${drv?.fullName || 'Assigned Driver'}\nThis trip is now active in the driver's portal.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to start trip');
      }
    } catch (err) {
      console.error(err);
      alert('Error starting trip');
    } finally {
      setStartingTrip(false);
    }
  };

  const filteredTrips = trips.filter((t) => {
    const matchesSearch =
      t.tripNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicleReg.toLowerCase().includes(search.toLowerCase()) ||
      t.driverName.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      t.loadingLocation.toLowerCase().includes(search.toLowerCase()) ||
      t.deliveryLocation.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.tripStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Commercial Trips & Freight Operations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Trip dispatching, odometer tracking, freight collections, and trip-level profitability
          </p>
        </div>

        <button
          type="button"
          onClick={() => setBookModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Trip</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trip #, route, vehicle, driver, customer..."
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
            <option value="all">All Trips ({trips.length})</option>
            <option value="in_progress">In Progress</option>
            <option value="assigned">Assigned / Planned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Trips Cards & Detailed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Trip # / Date</th>
                <th className="py-3 px-3">Vehicle & Driver</th>
                <th className="py-3 px-3">Route & Cargo</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-right">Agreed Freight</th>
                <th className="py-3 px-3 text-right">Balance Due</th>
                <th className="py-3 px-3 text-right font-bold text-slate-900">Trip Operating Profit</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-mono font-bold text-blue-700 block">{t.tripNumber}</span>
                    <span className="text-[10px] text-slate-400">{t.bookingDate}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{t.vehicleReg}</span>
                    <span className="text-[11px] text-slate-500">{t.driverName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800 block truncate max-w-xs">
                      {t.loadingLocation} &rarr; {t.deliveryLocation}
                    </span>
                    <span className="text-[11px] text-slate-500">{t.goodsDescription} {t.weightKg ? `(${t.weightKg} kg)` : ''}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-800">{t.customerName}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(t.freightAmount)}</td>
                  <td className="py-3 px-3 text-right font-semibold">
                    {t.balanceDue > 0 ? (
                      <span className="text-rose-600 block">{formatINR(t.balanceDue)}</span>
                    ) : (
                      <span className="text-emerald-600 font-bold block">Settled</span>
                    )}
                    <span className="text-[10px] text-slate-400">Paid: {formatINR(t.totalPaid)}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-black text-emerald-700 block">{formatINR(t.profit?.netProfit)}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Expenses: {formatINR(t.profit?.totalDirectExpenses)}</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={t.tripStatus} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap sm:flex-nowrap">
                      {(t.tripStatus === 'planned' || t.tripStatus === 'assigned') && (
                        <button
                          onClick={() => handleOpenStartModal(t)}
                          title="Start Trip (Assign Vehicle & Driver)"
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                          <span>Start</span>
                        </button>
                      )}
                      {t.tripStatus === 'in_progress' && (
                        <button
                          onClick={() => handleOpenCompleteModal(t)}
                          title="Complete Trip & Enter Closing Odometer"
                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3 text-blue-600" />
                          <span>Complete</span>
                        </button>
                      )}
                      {t.balanceDue > 0 && (
                        <button
                          onClick={() => {
                            setSelectedTripForPayment(t);
                            setPaymentFormData((prev) => ({ ...prev, amount: String(t.balanceDue) }));
                            setPaymentModalOpen(true);
                          }}
                          title="Record Payment"
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 transition-colors cursor-pointer"
                        >
                          + Pay
                        </button>
                      )}
                      <button
                        onClick={() => handleShareWhatsApp(t)}
                        title="Share Bilty on WhatsApp"
                        className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTripForSlip(t);
                          setSlipModalOpen(true);
                        }}
                        title="Print Trip Slip"
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
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

      {filteredTrips.length === 0 && !loading && (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <Navigation2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No commercial trips found.</p>
          <p className="text-xs text-slate-400 mt-1">Book your first freight delivery trip above.</p>
        </div>
      )}

      {/* Book New Trip Modal */}
      <Modal
        isOpen={bookModalOpen}
        onClose={() => setBookModalOpen(false)}
        title="Book Commercial Freight Delivery Trip"
        subtitle="Dispatch cargo with vehicle, driver, and freight terms"
        maxWidth="xl"
      >
        <form onSubmit={handleBookTrip} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Select Fleet Vehicle *
              </label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => {
                  const vId = e.target.value;
                  const selectedVeh = vehicles.find((v) => v.id === vId);
                  setFormData({
                    ...formData,
                    vehicleId: vId,
                    driverId: selectedVeh?.assignedDriverId || formData.driverId,
                    odometerStart: selectedVeh ? String(selectedVeh.currentOdometer) : '',
                  });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose vehicle --</option>
                {vehicles
                  .filter((v) => v.status === 'active' || v.status === 'in_service')
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.regNumber} — {v.name} ({v.currentOdometer} km)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Driver *
              </label>
              <select
                required
                value={formData.driverId}
                onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose driver --</option>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Customer Name / Consignor *
              </label>
              <input
                type="text"
                required
                list="customer-suggestions"
                value={formData.customerName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = customers.find((c) => c.name.toLowerCase() === val.toLowerCase());
                  setFormData({
                    ...formData,
                    customerName: val,
                    customerId: matched ? matched.id : '',
                    customerContactPhone: matched?.phone || formData.customerContactPhone,
                  });
                }}
                placeholder="Type customer or business name directly"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="customer-suggestions">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
              <p className="text-[10px] text-slate-400 mt-1">
                Type directly — no need to create a customer beforehand.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Customer Contact Phone
              </label>
              <input
                type="text"
                value={formData.customerContactPhone}
                onChange={(e) => setFormData({ ...formData, customerContactPhone: e.target.value })}
                placeholder="+91 94370 12345"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Pickup / Loading Location *
              </label>
              <input
                type="text"
                required
                value={formData.loadingLocation}
                onChange={(e) => setFormData({ ...formData, loadingLocation: e.target.value })}
                placeholder="e.g. Khurda Industrial Warehouse #3"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Drop / Delivery Location *
              </label>
              <input
                type="text"
                required
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                placeholder="e.g. Angul Central Mandi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Cargo Description & Packaging
              </label>
              <input
                type="text"
                value={formData.goodsDescription}
                onChange={(e) => setFormData({ ...formData, goodsDescription: e.target.value })}
                placeholder="e.g. Basmati Rice (50 kg bags)"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Weight (kg) or Quantity
              </label>
              <input
                type="number"
                value={formData.weightKg}
                onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                placeholder="1200"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Agreed Freight (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.freightAmount}
                onChange={(e) => setFormData({ ...formData, freightAmount: e.target.value })}
                placeholder="9500"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Advance Collected (₹)
              </label>
              <input
                type="number"
                value={formData.advanceReceived}
                onChange={(e) => setFormData({ ...formData, advanceReceived: e.target.value })}
                placeholder="4000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Starting Odometer (km)
              </label>
              <input
                type="number"
                value={formData.odometerStart}
                onChange={(e) => setFormData({ ...formData, odometerStart: e.target.value })}
                placeholder="48300"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setBookModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
            >
              Confirm & Dispatch Trip
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={selectedTripForPayment ? `Record Customer Payment for ${selectedTripForPayment.tripNumber}` : 'Record Payment'}
        subtitle={`Remaining Balance Due: ${formatINR(selectedTripForPayment?.balanceDue)}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Payment Amount (₹) *
            </label>
            <input
              type="number"
              required
              max={selectedTripForPayment?.balanceDue}
              value={paymentFormData.amount}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
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
                Payment Mode
              </label>
              <select
                value={paymentFormData.paymentMethod}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="upi">UPI / PhonePe / GPay</option>
                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="cash">Cash Collection</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Transaction Reference / UTR Number
            </label>
            <input
              type="text"
              value={paymentFormData.transactionRef}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionRef: e.target.value })}
              placeholder="e.g. UPI/261018884920"
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md cursor-pointer"
            >
              Record Payment
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Trip Slip Modal */}
      <Modal
        isOpen={slipModalOpen}
        onClose={() => setSlipModalOpen(false)}
        title="Official Commercial Trip Settlement Slip & Consignment Note"
        subtitle="Printable delivery acknowledgement, expense reconciliation, and client billing memo"
        maxWidth="3xl"
      >
        {selectedTripForSlip && (
          <div className="space-y-4">
            <div id="printable-trip-slip" className="printable-document p-6 sm:p-8 bg-white border border-slate-300 rounded-2xl text-slate-900 space-y-5 shadow-xs">
              {/* Header Letterhead */}
              <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-4 gap-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 uppercase tracking-tight">
                    {settings?.businessName || 'NAYAK TRANSPORT'}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600">
                    {settings?.tagline || 'Commercial Fleet Logistics & Cargo Carriers'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {settings?.address || 'Plot 104, Transport Nagar, Cuttack Road, Bhubaneswar, Odisha'}
                  </p>
                  <p className="text-[11px] text-slate-600 font-mono">
                    GSTIN: {settings?.gstin || '21AAACV3600A1Z5'} &bull; Ph: {settings?.phone || '+91 99380 75395'} &bull; Email: {settings?.email || 'sushantan34@gmail.com'}
                  </p>
                </div>
                <div className="sm:text-right bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-base sm:text-lg font-black font-mono text-blue-900 block">
                    {selectedTripForSlip.tripNumber}
                  </span>
                  <span className="text-xs font-medium text-slate-500 block">
                    Booking Date: {formatDateIST(selectedTripForSlip.bookingDate)}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mt-1">
                    Status: <span className="text-blue-700 font-black">{selectedTripForSlip.tripStatus?.replace('_', ' ')}</span>
                  </span>
                </div>
              </div>

              {/* Transit & Parties Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Assigned Fleet & Driver</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedTripForSlip.vehicleReg} <span className="text-xs font-normal text-slate-500">({selectedTripForSlip.vehicleName || 'Commercial Truck'})</span></div>
                  <div className="text-slate-700">Driver: <b>{selectedTripForSlip.driverName}</b></div>
                  <div className="text-slate-500">Mobile: {selectedTripForSlip.driverPhone || '—'}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Customer / Consignor</span>
                  <div className="font-bold text-slate-900 text-sm">{selectedTripForSlip.customerName}</div>
                  <div className="text-slate-700">Contact: {selectedTripForSlip.customerContactPhone || '—'}</div>
                  <div className="text-slate-500">Billing: Commercial Cargo Freight</div>
                </div>
              </div>

              {/* Route & Cargo Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Route Transit</span>
                  <span className="font-bold text-slate-900 block">{selectedTripForSlip.loadingLocation} &rarr; {selectedTripForSlip.deliveryLocation}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Cargo & Weight</span>
                  <span className="font-semibold text-slate-800 block">{selectedTripForSlip.goodsDescription} ({selectedTripForSlip.weightKg || 'Standard'} kg)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Odometer & Distance</span>
                  <span className="font-mono text-slate-800 block">
                    {selectedTripForSlip.odometerStart} km &rarr; {selectedTripForSlip.odometerEnd || '—'} km
                    {selectedTripForSlip.distanceKm ? ` (${selectedTripForSlip.distanceKm} km)` : ''}
                  </span>
                </div>
              </div>

              {/* Customer Billing & Collections Ledger */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Customer Freight Billing & Settlement Ledger
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTripForSlip.balanceDue === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedTripForSlip.balanceDue === 0 ? 'Paid in Full' : `Balance Due: ${formatINR(selectedTripForSlip.balanceDue)}`}
                  </span>
                </div>
                <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Agreed Freight Billed</span>
                    <span className="text-sm font-black text-slate-900">{formatINR(selectedTripForSlip.freightAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Advance Collected</span>
                    <span className="text-sm font-bold text-slate-700">{formatINR(selectedTripForSlip.advanceReceived || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Post-Trip Payments</span>
                    <span className="text-sm font-bold text-slate-700">
                      {formatINR(Math.max(0, (selectedTripForSlip.totalPaid || 0) - (selectedTripForSlip.advanceReceived || 0)))}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Balance Outstanding</span>
                    <span className={`text-sm font-black ${selectedTripForSlip.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatINR(selectedTripForSlip.balanceDue || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Direct Trip Operating Expenses Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3.5 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Direct Trip Operating Expenses (Approved Disbursements)
                  </span>
                  <span className="text-xs font-bold text-rose-700">
                    Total: {formatINR(selectedTripForSlip.profit?.totalDirectExpenses || 0)}
                  </span>
                </div>
                <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Diesel & Fuel</span>
                    <span className="font-bold text-amber-800 text-xs">{formatINR(selectedTripForSlip.profit?.fuelCost || 0)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">FASTag & Tolls</span>
                    <span className="font-bold text-slate-800 text-xs">{formatINR(selectedTripForSlip.profit?.tollCost || 0)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Loading & Labour (Hamali)</span>
                    <span className="font-bold text-slate-800 text-xs">{formatINR(selectedTripForSlip.profit?.loadingCost || 0)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Driver Trip Allowance</span>
                    <span className="font-bold text-blue-800 text-xs">{formatINR(selectedTripForSlip.profit?.driverAllowance || 0)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">En-route Repairs & Spares</span>
                    <span className="font-bold text-slate-800 text-xs">{formatINR(selectedTripForSlip.profit?.repairsCost || 0)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/60">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Other Trip Overheads</span>
                    <span className="font-bold text-slate-800 text-xs">{formatINR(selectedTripForSlip.profit?.otherTripCost || 0)}</span>
                  </div>
                </div>

                {/* Itemized Vouchers List if Present */}
                {(selectedTripForSlip.profit?.directExpensesList || []).length > 0 && (
                  <div className="border-t border-slate-200 px-3.5 py-2.5 bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Itemized Expense Vouchers Logged for this Trip:
                    </span>
                    <div className="space-y-1">
                      {selectedTripForSlip.profit.directExpensesList.map((exp: any) => (
                        <div key={exp.id} className="flex items-center justify-between text-[11px] text-slate-700 py-0.5 border-b border-slate-200/50 last:border-0">
                          <span>
                            <b className="uppercase text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 mr-1.5">{exp.category?.replace(/_/g, ' ')}</b>
                            {exp.description} {exp.vendor !== '—' ? `(${exp.vendor})` : ''}
                          </span>
                          <span className="font-mono font-bold text-slate-900">{formatINR(exp.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mathematical Operating Profit Equation & Performance Summary */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200 pb-2">
                  <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Trip Operating Profit & Return Calculation
                  </span>
                  <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-700 text-white">
                    Profit Margin: {selectedTripForSlip.profit?.profitMarginPercent || 0}%
                  </span>
                </div>

                <div className="text-xs font-mono text-emerald-900 space-y-1 pt-1">
                  <div className="flex items-center justify-between">
                    <span>1. Agreed Freight Revenue (Billed):</span>
                    <span className="font-bold">{formatINR(selectedTripForSlip.freightAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-rose-700">
                    <span>2. Less: Total Direct Operating Expenses:</span>
                    <span className="font-bold">- {formatINR(selectedTripForSlip.profit?.totalDirectExpenses || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-black text-emerald-950 border-t border-emerald-300 pt-1">
                    <span>3. Net Trip Operating Profit:</span>
                    <span>= {formatINR(selectedTripForSlip.profit?.netProfit || 0)}</span>
                  </div>
                </div>

                {selectedTripForSlip.profit?.distanceKm > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-200 text-center text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Cost / Km</span>
                      <b className="text-slate-800">₹{selectedTripForSlip.profit?.costPerKm} / km</b>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Revenue / Km</span>
                      <b className="text-slate-800">₹{selectedTripForSlip.profit?.revenuePerKm} / km</b>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Net Profit / Km</span>
                      <b className="text-emerald-800">₹{selectedTripForSlip.profit?.profitPerKm} / km</b>
                    </div>
                  </div>
                )}
              </div>

              {/* Statutory Signatures & Rubber Stamp Block */}
              <div className="pt-6 grid grid-cols-3 gap-6 text-center text-xs text-slate-500">
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-semibold text-slate-700">Driver's Signature</span>
                  <span className="text-[10px] text-slate-400">Goods In Transit Delivered Intact</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-semibold text-slate-700">Consignee Receiver's Stamp</span>
                  <span className="text-[10px] text-slate-400">Date & Physical Receipt Seal</span>
                </div>
                <div className="border-t border-slate-300 pt-1.5">
                  <span className="block font-semibold text-slate-700">Fleet Owner / Authorised</span>
                  <span className="text-[10px] text-slate-400">Accounts & Settlement Verified</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 no-print flex-wrap">
              <button
                type="button"
                onClick={() => setSlipModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleShareWhatsApp(selectedTripForSlip)}
                className="px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Share Bilty on WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Trip Slip</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Complete Trip & Record Closing Odometer Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Trip & Record Closing Odometer"
        subtitle="Enter the final odometer reading upon trip completion to automatically update vehicle details"
        maxWidth="md"
      >
        {selectedTripForComplete && (
          <form onSubmit={handleCompleteTrip} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Trip Number:</span>
                <span className="font-mono font-bold text-blue-700">{selectedTripForComplete.tripNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Vehicle / Driver:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTripForComplete.vehicleReg} &bull; {selectedTripForComplete.driverName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Route:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTripForComplete.loadingLocation} &rarr; {selectedTripForComplete.deliveryLocation}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-slate-200 pt-2">
                <span className="text-slate-500 font-medium">Trip Starting Odometer:</span>
                <span className="font-mono font-bold text-slate-900">{selectedTripForComplete.odometerStart || 0} km</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Closing Odometer Reading (km) *
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  min={selectedTripForComplete.odometerStart || 0}
                  step="any"
                  value={completeOdometerEnd}
                  onChange={(e) => setCompleteOdometerEnd(e.target.value)}
                  placeholder={`e.g. ${(selectedTripForComplete.odometerStart || 0) + 150}`}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border-2 border-blue-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:border-blue-600"
                />
              </div>
              {completeOdometerEnd && !isNaN(Number(completeOdometerEnd)) && (
                <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Calculated Trip Distance:</span>
                    <span className="font-bold text-blue-800">
                      {Math.max(0, Number(completeOdometerEnd) - (selectedTripForComplete.odometerStart || 0))} km
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-700 font-semibold flex items-center gap-1.5 pt-1.5 border-t border-blue-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Vehicle {selectedTripForComplete.vehicleReg} odometer will automatically update to {completeOdometerEnd} km</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={completingTrip}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{completingTrip ? 'Completing...' : 'Complete Trip & Update Vehicle Odometer'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Start / Dispatch Trip Modal */}
      <Modal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        title="Start & Dispatch Commercial Trip"
        subtitle="Select the vehicle and driver assigned to this trip before departure"
        maxWidth="lg"
      >
        {selectedTripForStart && (
          <form onSubmit={handleStartTrip} className="space-y-4">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Trip Number:</span>
                <span className="font-mono font-bold text-blue-700">{selectedTripForStart.tripNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Route:</span>
                <span className="font-semibold text-slate-800">
                  {selectedTripForStart.loadingLocation} &rarr; {selectedTripForStart.deliveryLocation}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Cargo / Customer:</span>
                <span className="text-slate-700">
                  {selectedTripForStart.goodsDescription} ({selectedTripForStart.weightKg || 0} kg) &bull; {selectedTripForStart.customerName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Fleet Vehicle *
                </label>
                <select
                  required
                  value={startFormData.vehicleId}
                  onChange={(e) => {
                    const vId = e.target.value;
                    const v = vehicles.find((veh) => veh.id === vId);
                    setStartFormData({
                      ...startFormData,
                      vehicleId: vId,
                      driverId: v?.assignedDriverId || startFormData.driverId,
                      odometerStart: v ? String(v.currentOdometer) : startFormData.odometerStart,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose vehicle --</option>
                  {vehicles
                    .filter((v) => v.status === 'active' || v.status === 'in_service' || v.id === selectedTripForStart.vehicleId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.regNumber} — {v.name} ({v.currentOdometer?.toLocaleString()} km)
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Selecting a vehicle automatically loads its current odometer reading.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Active Driver *
                </label>
                <select
                  required
                  value={startFormData.driverId}
                  onChange={(e) => setStartFormData({ ...startFormData, driverId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose driver --</option>
                  {drivers
                    .filter((d) => d.accountStatus === 'approved' || d.id === selectedTripForStart.driverId)
                    .map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.fullName} ({drv.phone})
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  This trip will instantly appear in this driver's mobile portal.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Starting Odometer Reading (km) *
                </label>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={startFormData.odometerStart}
                    onChange={(e) => setStartFormData({ ...startFormData, odometerStart: e.target.value })}
                    placeholder="e.g. 45200"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Departure Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startFormData.tripStartDate}
                  onChange={(e) => setStartFormData({ ...startFormData, tripStartDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Starting this trip marks it <b>IN PROGRESS</b> and syncs the assigned vehicle and driver in real-time.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setStartModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={startingTrip}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{startingTrip ? 'Starting Trip...' : 'Confirm & Start Trip'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
