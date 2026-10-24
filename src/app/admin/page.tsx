'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck,
  Users,
  Navigation2,
  TrendingUp,
  Receipt,
  Wallet,
  Clock,
  AlertTriangle,
  DatabaseBackup,
  ArrowUpRight,
  ShieldAlert,
  FileCheck2,
  Check,
  X,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { formatINR, formatDateIST } from '@/lib/accounting';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Quick action: approve driver
  const handleApproveDriver = async (driverId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountStatus: status }),
      });
      if (res.ok) {
        setActionMessage(`Driver registration marked as ${status}.`);
        setTimeout(() => setActionMessage(''), 4000);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick action: approve expense
  const handleApproveExpense = async (expenseId: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalStatus: status }),
      });
      if (res.ok) {
        setActionMessage(`Expense claim ${status}.`);
        setTimeout(() => setActionMessage(''), 4000);
        fetchDashboardData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const charts = data?.charts || {};
  const recent = data?.recent || {};

  const COLORS = ['#1e3a8a', '#0284c7', '#0d9488', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Commercial Fleet Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time business performance, freight receivables, and compliance health
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/backup"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <DatabaseBackup className="w-4 h-4 text-amber-400" />
            <span>Full Backup (.txt)</span>
          </Link>
          <Link
            href="/admin/trips"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs"
          >
            <Navigation2 className="w-4 h-4" />
            <span>Book New Trip</span>
          </Link>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage('')} className="text-emerald-700 hover:text-emerald-900 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Monthly Operating Profit"
          value={formatINR(summary.netOperatingProfit)}
          subtitle="Total freight minus operating costs"
          icon={TrendingUp}
          variant="green"
          href="/admin/reports"
        />

        <StatCard
          title="Freight Billed (Revenue)"
          value={formatINR(summary.totalFreightBilled)}
          subtitle={`Collected: ${formatINR(summary.totalPaymentsReceived)}`}
          icon={IndianRupee}
          variant="blue"
          href="/admin/trips"
        />

        <StatCard
          title="Operating Expenses"
          value={formatINR(summary.totalOperatingExpenses)}
          subtitle={`Fuel: ${formatINR(summary.totalFuelCost)}`}
          icon={Receipt}
          variant="amber"
          href="/admin/expenses"
        />

        <StatCard
          title="Customer Dues Pending"
          value={formatINR(summary.customerPendingDues)}
          subtitle="Uncollected trip freight balances"
          icon={Wallet}
          variant={summary.customerPendingDues > 0 ? 'red' : 'green'}
          href="/admin/trips"
        />
      </div>

      {/* Fleet & Compliance Quick Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] uppercase font-bold text-slate-500">Total Vehicles</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-slate-900">{summary.totalVehicles || 0}</span>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {summary.activeVehicles || 0} active
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] uppercase font-bold text-slate-500">In Maintenance</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-amber-600">{summary.maintenanceVehicles || 0}</span>
            <Link href="/admin/maintenance" className="text-[10px] text-blue-600 font-semibold hover:underline">
              View
            </Link>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] uppercase font-bold text-slate-500">Active Trips</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-blue-600">{summary.activeTrips || 0}</span>
            <span className="text-[10px] text-slate-500">{summary.completedTrips || 0} completed</span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] uppercase font-bold text-slate-500">Pending Drivers</p>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xl font-black ${summary.pendingDrivers > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {summary.pendingDrivers || 0}
            </span>
            {summary.pendingDrivers > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded animate-pulse">
                Needs Review
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] uppercase font-bold text-slate-500">Doc Expiries</p>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xl font-black ${summary.overdueDocuments > 0 ? 'text-rose-600' : summary.upcomingDocExpiries > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {(summary.upcomingDocExpiries || 0) + (summary.overdueDocuments || 0)}
            </span>
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">
              {summary.overdueDocuments || 0} overdue
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <p className="text-[10px] uppercase font-bold text-slate-500">Unpaid Challans</p>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-xl font-black ${summary.unpaidChallansCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {summary.unpaidChallansCount || 0}
            </span>
            <span className="text-[10px] font-bold text-rose-600">
              {formatINR(summary.totalUnpaidChallansAmount || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Freight Income vs Operating Expenses</h3>
              <p className="text-xs text-slate-500">6-Month historical performance trend (₹ INR)</p>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
              Accrual Basis
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyTrend || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis
                  tickFormatter={(val) => `₹${val / 1000}k`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Freight Revenue" fill="#1e3a8a" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="expenses" name="Operating Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="profit" name="Net Operating Profit" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Operating Expense Breakdown</h3>
            <p className="text-xs text-slate-500 mb-3">Distribution across transport heads</p>

            <div className="h-48 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.expenseBreakdown || []}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {(charts.expenseBreakdown || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val)), 'Amount']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 max-h-36 overflow-y-auto">
            {(charts.expenseBreakdown || []).slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-slate-600 truncate">{item.category}</span>
                </div>
                <span className="font-semibold text-slate-900">{formatINR(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Profitability Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Vehicle-Wise Profitability Summary</h3>
            <p className="text-xs text-slate-500">Performance and return per commercial vehicle</p>
          </div>
          <Link href="/admin/vehicles" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Manage Fleet &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">Vehicle / Model</th>
                <th className="py-2.5 px-3 text-center">Trips</th>
                <th className="py-2.5 px-3 text-right">Distance</th>
                <th className="py-2.5 px-3 text-right">Freight Billed</th>
                <th className="py-2.5 px-3 text-right">Fuel Cost</th>
                <th className="py-2.5 px-3 text-right">Maintenance</th>
                <th className="py-2.5 px-3 text-right">Total Expenses</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900">Net Profit</th>
                <th className="py-2.5 px-3 rounded-r-lg text-center">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(charts.vehicleProfitability || []).map((vp: any) => (
                <tr key={vp.vehicleId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block">{vp.regNumber}</span>
                    <span className="text-[11px] text-slate-500">{vp.name} ({vp.model})</span>
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">{vp.tripCount}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-600">{vp.totalDistance} km</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(vp.totalFreight)}</td>
                  <td className="py-3 px-3 text-right font-medium text-amber-700">{formatINR(vp.fuelCost)}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">{formatINR(vp.maintenanceCost)}</td>
                  <td className="py-3 px-3 text-right font-medium text-rose-700">{formatINR(vp.totalExpenses)}</td>
                  <td className="py-3 px-3 text-right font-black text-emerald-700">{formatINR(vp.netProfit)}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {vp.profitMargin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Approvals & Operations Two-Column Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Driver Registrations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Driver Registrations Awaiting Approval</h3>
            </div>
            <Link href="/admin/drivers" className="text-xs text-blue-600 font-bold hover:underline">
              All Drivers
            </Link>
          </div>

          {recent.pendingDriverApprovals && recent.pendingDriverApprovals.length > 0 ? (
            <div className="space-y-3">
              {recent.pendingDriverApprovals.map((drv: any) => (
                <div
                  key={drv.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-900">{drv.fullName}</p>
                    <p className="text-[11px] text-slate-500">
                      DL: <span className="font-mono text-slate-700">{drv.dlNumber}</span> &bull; {drv.phone}
                    </p>
                    <p className="text-[10px] text-slate-400">Expiry: {drv.dlExpiryDate}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleApproveDriver(drv.id, 'approved')}
                      title="Approve Driver"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApproveDriver(drv.id, 'rejected')}
                      title="Reject Driver"
                      className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No pending driver signups. All applications have been processed.
            </div>
          )}
        </div>

        {/* Pending Trip Expense Claims */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Trip Expenses Awaiting Approval</h3>
            </div>
            <Link href="/admin/expenses" className="text-xs text-blue-600 font-bold hover:underline">
              All Expenses
            </Link>
          </div>

          {recent.pendingExpenses && recent.pendingExpenses.length > 0 ? (
            <div className="space-y-3">
              {recent.pendingExpenses.map((exp: any) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{formatINR(exp.amount)}</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        {exp.category.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">{exp.description}</p>
                    <p className="text-[10px] text-slate-400">
                      By: {exp.driverName} &bull; {exp.vehicleReg}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleApproveExpense(exp.id, 'approved')}
                      title="Approve Claim"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleApproveExpense(exp.id, 'rejected')}
                      title="Reject Claim"
                      className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              No pending expense claims from drivers.
            </div>
          )}
        </div>
      </div>

      {/* Recent Trips Table */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Commercial Trips</h3>
            <p className="text-xs text-slate-500">Latest active and completed cargo assignments</p>
          </div>
          <Link href="/admin/trips" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            View All Trips &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">Trip #</th>
                <th className="py-2.5 px-3">Route (From &rarr; To)</th>
                <th className="py-2.5 px-3">Vehicle & Driver</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3 text-right">Freight</th>
                <th className="py-2.5 px-3 text-right">Balance Due</th>
                <th className="py-2.5 px-3 rounded-r-lg text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(recent.trips || []).map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">{t.tripNumber}</td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-900 block truncate max-w-xs">
                      {t.loadingLocation} &rarr; {t.deliveryLocation}
                    </span>
                    <span className="text-[11px] text-slate-500">{t.goodsDescription}</span>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-800 block">{t.vehicleReg}</span>
                    <span className="text-[11px] text-slate-500">{t.driverName}</span>
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-700">{t.customerName}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(t.freightAmount)}</td>
                  <td className="py-3 px-3 text-right font-semibold">
                    {t.balanceDue > 0 ? (
                      <span className="text-rose-600">{formatINR(t.balanceDue)}</span>
                    ) : (
                      <span className="text-emerald-600">Settled</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge status={t.tripStatus} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
