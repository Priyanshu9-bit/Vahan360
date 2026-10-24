'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Navigation2,
  Receipt,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Plus,
  Shield,
  FileCheck2,
  Calendar,
  IndianRupee,
  Phone,
  MapPin,
  LogOut,
  UserMinus,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR } from '@/lib/accounting';

export default function DriverDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  // Complete Trip Modal
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [odometerEnd, setOdometerEnd] = useState('');

  // Submit Expense Modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    category: 'fuel',
    amount: '',
    paymentMethod: 'fastag',
    vendor: '',
    description: '',
  });

  // Quit Job / Resign Modal
  const [resignModalOpen, setResignModalOpen] = useState(false);
  const [resignReason, setResignReason] = useState('');
  const [submittingResign, setSubmittingResign] = useState(false);

  const fetchDriverData = async () => {
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
    fetchDriverData();
  }, []);

  const handleStartTrip = async (tripId: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${tripId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripStatus: 'in_progress' }),
      });
      if (res.ok) {
        setActionMessage('Trip started! Drive safely.');
        setTimeout(() => setActionMessage(''), 4000);
        fetchDriverData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !odometerEnd) return;

    try {
      const res = await fetch(`/api/driver/trips/${selectedTrip.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripStatus: 'completed',
          odometerEnd: Number(odometerEnd),
        }),
      });

      if (res.ok) {
        setCompleteModalOpen(false);
        setOdometerEnd('');
        setActionMessage('Trip marked as completed! Distance recorded.');
        setTimeout(() => setActionMessage(''), 4000);
        fetchDriverData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete trip');
      }
    } catch {
      alert('Error completing trip');
    }
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseData.amount || !expenseData.description) {
      alert('Please enter amount and description.');
      return;
    }

    try {
      const res = await fetch('/api/driver/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData),
      });

      if (res.ok) {
        setExpenseModalOpen(false);
        setExpenseData({
          category: 'fuel',
          amount: '',
          paymentMethod: 'fastag',
          vendor: '',
          description: '',
        });
        setActionMessage('Expense claim submitted! Awaiting owner approval.');
        setTimeout(() => setActionMessage(''), 4000);
        fetchDriverData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit expense');
      }
    } catch {
      alert('Error submitting expense');
    }
  };

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
        fetchDriverData();
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

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading your driver dashboard...</div>;
  }

  const driver = data?.driver || {};
  const vehicle = data?.assignedVehicle;
  const vehicleDocs = data?.vehicleDocs || [];
  const trips = data?.trips || [];
  const expenses = data?.expenses || [];
  const salary = data?.salary || {};
  const settlementSummary = data?.settlementSummary;

  const activeTrip = trips.find((t: any) => t.tripStatus === 'in_progress');
  const pendingTrips = trips.filter((t: any) => t.tripStatus === 'assigned' || t.tripStatus === 'planned');

  return (
    <div className="space-y-6 pb-12">
      {/* Driver Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Namaste, {driver.fullName}!
            </h2>
            <StatusBadge status={driver.accountStatus || 'approved'} size="sm" />
          </div>
          <p className="text-xs text-slate-500">
            Commercial Driver Portal &bull; Driving Licence: <span className="font-mono font-bold text-slate-700">{driver.dlNumber}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Fuel / Toll Claim</span>
          </button>

          {driver.accountStatus === 'resigned' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300">
              <Clock className="w-3.5 h-3.5" />
              <span>Resignation Submitted</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setResignModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors shadow-xs cursor-pointer"
              title="Submit resignation and review pending financial settlement"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Quit Job / Resign</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="font-bold cursor-pointer">&times;</button>
        </div>
      )}

      {/* Driver Pending Financial Settlement & Account Status Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                Financial Settlement Status
              </span>
              <StatusBadge status={driver.accountStatus || 'approved'} size="sm" />
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Financial Dues & Pending Balance</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {settlementSummary?.statusNotice || 'Itemized real-time calculation of pending salary slips, approved expenses, and advances.'}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs px-4 py-3 rounded-xl border border-white/15 shrink-0">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-300 font-bold block">
                Net Pending Settlement
              </span>
              <span className={`text-xl font-black ${
                (settlementSummary?.netPendingAmount || 0) > 0
                  ? 'text-emerald-400'
                  : (settlementSummary?.netPendingAmount || 0) < 0
                  ? 'text-amber-400'
                  : 'text-white'
              }`}>
                {formatINR(settlementSummary?.netPendingAmount || 0)}
              </span>
            </div>

            {driver.accountStatus !== 'resigned' ? (
              <button
                type="button"
                onClick={() => setResignModalOpen(true)}
                className="ml-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Quit Job</span>
              </button>
            ) : (
              <span className="ml-2 px-2.5 py-1 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Pending Final Pay
              </span>
            )}
          </div>
        </div>

        {/* Itemized balance breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] text-slate-400 block font-medium">Unpaid Salary Dues</span>
            <span className="font-bold text-white text-sm">
              {formatINR(settlementSummary?.unpaidSalaryDue || 0)}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] text-slate-400 block font-medium">Approved Reimbursements</span>
            <span className="font-bold text-emerald-400 text-sm">
              +{formatINR(settlementSummary?.approvedUnpaidExpenses || 0)}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] text-slate-400 block font-medium">Claims In Review</span>
            <span className="font-bold text-amber-300 text-sm">
              {formatINR(settlementSummary?.pendingExpenseClaims || 0)}
            </span>
          </div>
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5">
            <span className="text-[10px] text-slate-400 block font-medium">Agreed Monthly Pay</span>
            <span className="font-bold text-blue-300 text-sm">
              {formatINR(driver.agreedSalary || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Licence Expiry Reminder Alert */}
      {driver.dlDaysRemaining <= 30 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Driving Licence Renewal Alert:</span> Your commercial DL ({driver.dlNumber}) expires on{' '}
            <b>{driver.dlExpiryDate}</b> ({driver.dlDaysRemaining} days remaining). Please renew at the RTO to maintain active dispatch permissions.
          </div>
        </div>
      )}

      {/* Top Cards: Assigned Vehicle & Active Trip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Assigned Vehicle Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" /> My Assigned Vehicle
              </span>
              {vehicle && <StatusBadge status={vehicle.status} size="sm" />}
            </div>

            {vehicle ? (
              <div className="space-y-3">
                <div>
                  <span className="text-xl font-black font-mono text-slate-900 block">{vehicle.regNumber}</span>
                  <p className="text-xs font-semibold text-slate-600">{vehicle.name} ({vehicle.model})</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Odometer</span>
                    <span className="font-bold text-slate-800 font-mono">{vehicle.currentOdometer.toLocaleString()} km</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Fuel Type</span>
                    <span className="font-bold text-slate-800">{vehicle.fuelType}</span>
                  </div>
                </div>

                {/* Road Compliance Badges */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Vehicle Road Compliance</span>
                  <div className="flex flex-wrap gap-1.5">
                    {vehicleDocs.map((doc: any) => (
                      <span key={doc.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        <span className="uppercase">{doc.docType}:</span>
                        <StatusBadge status={doc.status} size="sm" />
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No vehicle currently assigned by fleet owner.
              </div>
            )}
          </div>
        </div>

        {/* Current Active Trip Card */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Navigation2 className="w-4 h-4" /> Active Delivery Run
              </span>
              {activeTrip ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  In Progress
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">No active run</span>
              )}
            </div>

            {activeTrip ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-base font-black font-mono text-white block">{activeTrip.tripNumber}</span>
                  <p className="text-slate-300 mt-1 font-semibold flex items-center gap-1.5">
                    <span>{activeTrip.loadingLocation}</span>
                    <span>&rarr;</span>
                    <span className="text-blue-300">{activeTrip.deliveryLocation}</span>
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 space-y-1">
                  <div>Assigned Vehicle: <b className="text-white font-mono">{activeTrip.vehicleReg}</b> {activeTrip.vehicleName ? `(${activeTrip.vehicleName})` : ''}</div>
                  <div>Cargo: <b className="text-white">{activeTrip.goodsDescription}</b> ({activeTrip.weightKg} kg)</div>
                  <div>Consignee Phone: <b className="text-white">{activeTrip.customerPhone}</b></div>
                  <div>Starting Odometer: <b className="text-white font-mono">{activeTrip.odometerStart} km</b></div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrip(activeTrip);
                    setOdometerEnd(String(activeTrip.odometerStart + 50));
                    setCompleteModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Mark Trip as Completed</span>
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <p>You have no active trip running right now.</p>
                {pendingTrips.length > 0 && (
                  <p className="text-blue-400 font-semibold">
                    You have {pendingTrips.length} upcoming assigned trip(s) below!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned / Upcoming Trips Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Navigation2 className="w-4 h-4 text-blue-600" />
          <span>My Assigned Trips ({trips.length})</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Trip #</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Route (From &rarr; To)</th>
                <th className="py-2.5 px-3">Cargo Details</th>
                <th className="py-2.5 px-3">Customer Phone</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">{t.tripNumber}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block font-mono">{t.vehicleReg || '—'}</span>
                    <span className="text-[10px] text-slate-400">{t.vehicleName}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block">{t.loadingLocation} &rarr; {t.deliveryLocation}</span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{t.goodsDescription} ({t.weightKg} kg)</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{t.customerPhone}</td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={t.tripStatus} size="sm" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    {t.tripStatus === 'assigned' && (
                      <button
                        onClick={() => handleStartTrip(t.id)}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 mx-auto transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        <span>Start Trip</span>
                      </button>
                    )}
                    {t.tripStatus === 'in_progress' && (
                      <button
                        onClick={() => {
                          setSelectedTrip(t);
                          setOdometerEnd(String(t.odometerStart + 50));
                          setCompleteModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 mx-auto transition-colors"
                      >
                        <Check className="w-3 h-3" />
                        <span>Complete</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver's Expenses Tracking */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-600" />
            <span>My Submitted Expense Claims ({expenses.length})</span>
          </h3>
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            + New Claim
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((e: any) => (
                <tr key={e.id}>
                  <td className="py-2.5 px-3 text-slate-600">{e.expenseDate}</td>
                  <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-slate-700">
                    {e.category.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{e.description}</td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatINR(e.amount)}</td>
                  <td className="py-2.5 px-3 text-center">
                    <StatusBadge status={e.approvalStatus} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Trip Modal */}
      <Modal
        isOpen={completeModalOpen}
        onClose={() => setCompleteModalOpen(false)}
        title="Complete Commercial Delivery Run"
        subtitle={`Trip ${selectedTrip?.tripNumber} &bull; Starting Odometer: ${selectedTrip?.odometerStart} km`}
        maxWidth="md"
      >
        <form onSubmit={handleCompleteTrip} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Final Closing Odometer Reading (km) *
            </label>
            <input
              type="number"
              required
              min={selectedTrip?.odometerStart}
              value={odometerEnd}
              onChange={(e) => setOdometerEnd(e.target.value)}
              placeholder="e.g. 48650"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
            {odometerEnd && Number(odometerEnd) >= (selectedTrip?.odometerStart || 0) && (
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                Calculated Distance: {Number(odometerEnd) - selectedTrip.odometerStart} km
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCompleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md cursor-pointer"
            >
              Confirm Delivery & Close Trip
            </button>
          </div>
        </form>
      </Modal>

      {/* Submit Expense Modal */}
      <Modal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        title="Submit Trip Expense Claim"
        subtitle="Claim reimbursement for diesel, highway tolls, food allowance, or repairs"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Expense Category *
            </label>
            <select
              value={expenseData.category}
              onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="fuel">Diesel / Fuel</option>
              <option value="toll_fastag">FASTag / Toll Plaza</option>
              <option value="driver_allowance">Driver Food & Road Allowance</option>
              <option value="parking">Parking Charges</option>
              <option value="loading_unloading">Loading / Unloading Labour</option>
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
              value={expenseData.amount}
              onChange={(e) => setExpenseData({ ...expenseData, amount: e.target.value })}
              placeholder="350"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Vendor / Petrol Bunk / Toll Plaza
            </label>
            <input
              type="text"
              value={expenseData.vendor}
              onChange={(e) => setExpenseData({ ...expenseData, vendor: e.target.value })}
              placeholder="e.g. Indian Oil / Panikoili Toll Plaza"
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
              value={expenseData.description}
              onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })}
              placeholder="e.g. Diesel 12 Litres for Angul return trip"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setExpenseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md cursor-pointer"
            >
              Submit for Approval
            </button>
          </div>
        </form>
      </Modal>

      {/* Quit Job / Request Resignation Modal */}
      <Modal
        isOpen={resignModalOpen}
        onClose={() => setResignModalOpen(false)}
        title="Quit Job / Request Resignation"
        subtitle="Review your pending financial settlement and dues before submitting resignation"
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Outstanding Settlement Breakdown Box */}
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

          {/* Settlement Status Notice */}
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

          {vehicle && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Assigned vehicle <b>{vehicle.regNumber} ({vehicle.name})</b> will be unallocated and returned to the fleet pool.</span>
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
              placeholder="e.g. Relocating back to hometown / Personal reasons / Medical emergency"
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
