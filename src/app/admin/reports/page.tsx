'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  TrendingUp,
  Receipt,
  Truck,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { formatINR, formatDateIST, formatDateTimeIST } from '@/lib/accounting';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, setRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch('/api/admin/settings'),
        ]);
        if (dashRes.ok) {
          const json = await dashRes.json();
          setData(json);
        }
        if (setRes.ok) {
          const sJson = await setRes.json();
          setSettings(sJson.settings || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const summary = data?.summary || {};
  const charts = data?.charts || {};
  const expenseBreakdown = charts?.expenseBreakdown || [];
  const vehicleProfitability = charts?.vehicleProfitability || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Financial Statements & Fleet Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Profit & loss statements, itemized expense ledgers, vehicle profitability, and cash flow proofs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print Financial Statement</span>
          </button>
          <a
            href="/api/backup/download-txt"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Download English Report (.txt)</span>
          </a>
          <a
            href="/api/backup/export-csv?type=financials"
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Statement (.csv)</span>
          </a>
        </div>
      </div>

      {/* Screen Interactive P&L Summary Cards (Hidden on Print) */}
      <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-md border border-slate-800 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-3 gap-2">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Commercial Fleet Profit & Loss (FY 2026-27)</span>
            </h3>
            <p className="text-xs text-slate-400">Strict Accrual Accounting: Recognized Freight vs Approved Operating Expenses</p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-blue-900/60 text-blue-300 border border-blue-700 self-start sm:self-auto">
            INR (₹) / IST Timezone
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Freight Revenue</span>
            <span className="text-lg font-black text-white">{formatINR(summary.totalFreightBilled)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Billed from trips</span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Operating Expenses</span>
            <span className="text-lg font-black text-amber-400">{formatINR(summary.totalOperatingExpenses)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Approved fleet costs</span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Net Operating Profit</span>
            <span className="text-lg font-black text-emerald-400">{formatINR(summary.netOperatingProfit)}</span>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">Margin: {summary.profitMarginPercent || 0}%</span>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Receivables</span>
            <span className="text-lg font-black text-rose-400">{formatINR(summary.customerPendingDues)}</span>
            <span className="text-[10px] text-rose-400/80 block mt-0.5">Pending collection</span>
          </div>
        </div>
      </div>

      {/* Screen Audited Mathematical Proof Block (Hidden on Print) */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 no-print">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-blue-600" />
          <span>Strict Mathematical Verification & Profit Proof</span>
        </h3>
        <p className="text-xs text-slate-500">
          Transparent step-by-step arithmetic showing how every rupee is accounted for
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono pt-1">
          {/* Equation 1: Operating Profit */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-sans font-bold text-slate-800 uppercase block tracking-wider">
              1. Operating Profit Reconciliation
            </span>
            <div className="flex justify-between text-slate-700">
              <span>Gross Freight Billed:</span>
              <span className="font-bold text-slate-900">{formatINR(summary.totalFreightBilled)}</span>
            </div>
            <div className="flex justify-between text-rose-700">
              <span>Less Operating Expenses:</span>
              <span className="font-bold">- {formatINR(summary.totalOperatingExpenses)}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-black border-t border-slate-300 pt-1 text-sm">
              <span>Net Operating Profit:</span>
              <span>= {formatINR(summary.netOperatingProfit)}</span>
            </div>
            <div className="text-[10px] text-slate-500 font-sans pt-1">
              Proof: {formatINR(summary.totalFreightBilled)} - {formatINR(summary.totalOperatingExpenses)} = {formatINR(summary.netOperatingProfit)} ({summary.profitMarginPercent}% margin)
            </div>
          </div>

          {/* Equation 2: Cash Flow */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-[11px] font-sans font-bold text-slate-800 uppercase block tracking-wider">
              2. Cash Flow & Treasury Balance
            </span>
            <div className="flex justify-between text-slate-700">
              <span>Customer Cash Collected:</span>
              <span className="font-bold text-slate-900">{formatINR(summary.totalPaymentsReceived)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Less Operating Costs Paid:</span>
              <span className="font-bold">- {formatINR(summary.totalOperatingExpenses)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Less Vehicle EMIs Disbursed:</span>
              <span className="font-bold">- {formatINR(summary.totalEmiPayments)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Less Driver Salaries Disbursed:</span>
              <span className="font-bold">- {formatINR(summary.totalSalariesPaid)}</span>
            </div>
            <div className="flex justify-between text-blue-700 font-black border-t border-slate-300 pt-1 text-sm">
              <span>Net Operational Cash Surplus:</span>
              <span>= {formatINR(summary.netCashFlow)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Expense Category Breakdown (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Itemized Operating Expenditure Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">Approved expense disbursements categorized by operational heads</p>
          </div>
          <span className="text-xs font-bold text-slate-700">
            Total Disbursed: <span className="font-black text-slate-900">{formatINR(summary.totalOperatingExpenses)}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Expense Head</th>
                <th className="py-2.5 px-3 text-center">Vouchers Count</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 text-right">Share of Expenses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseBreakdown.map((item: any) => (
                <tr key={item.categoryKey} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{item.category}</td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-600">{item.count}</td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatINR(item.amount)}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-mono text-slate-600">{item.percentage}%</span>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td className="py-2.5 px-3 text-slate-900">Total Approved Operating Expenses</td>
                <td className="py-2.5 px-3 text-center font-mono">{expenseBreakdown.reduce((sum: number, i: any) => sum + i.count, 0)}</td>
                <td className="py-2.5 px-3 text-right text-rose-700 text-sm font-black">{formatINR(summary.totalOperatingExpenses)}</td>
                <td className="py-2.5 px-3 text-right font-mono">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen Vehicle-wise Profit Breakdown (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs no-print">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Vehicle-Wise Profit & Return On Investment</h3>
        <p className="text-xs text-slate-500 mb-4">Detailed breakdown of freight earned against vehicle expenses and maintenance</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3 text-center">Trips</th>
                <th className="py-2.5 px-3 text-right">Distance</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900">Freight Billed</th>
                <th className="py-2.5 px-3 text-right text-amber-700">Diesel</th>
                <th className="py-2.5 px-3 text-right text-slate-700">Workshop</th>
                <th className="py-2.5 px-3 text-right text-rose-700 font-bold">Total Expenses</th>
                <th className="py-2.5 px-3 text-right text-emerald-700 font-black">Net Profit</th>
                <th className="py-2.5 px-3 text-center">Margin %</th>
                <th className="py-2.5 px-3 text-right">Cost/km</th>
                <th className="py-2.5 px-3 text-right">Profit/km</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicleProfitability.map((vp: any) => (
                <tr key={vp.vehicleId} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900 block font-mono">{vp.regNumber}</span>
                    <span className="text-[11px] text-slate-500">{vp.name}</span>
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-slate-700">{vp.tripCount}</td>
                  <td className="py-3 px-3 text-right font-mono">{vp.totalDistance} km</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{formatINR(vp.totalFreight)}</td>
                  <td className="py-3 px-3 text-right font-medium text-amber-700">{formatINR(vp.fuelCost)}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">{formatINR(vp.maintenanceCost)}</td>
                  <td className="py-3 px-3 text-right font-bold text-rose-700">{formatINR(vp.totalExpenses)}</td>
                  <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">{formatINR(vp.netProfit)}</td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {vp.profitMargin}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">₹{vp.costPerKm}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">₹{vp.profitPerKm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen Modular CSV Export Centre (Hidden on Print) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3 no-print">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          <span>Export Individual Subsystem Reports</span>
        </h3>
        <p className="text-xs text-slate-500">
          Download formatted CSV logs for accounting, auditor review, and client billing
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <a
            href="/api/backup/export-csv?type=trips"
            download
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between"
          >
            <span>Trip Register (.csv)</span>
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </a>
          <a
            href="/api/backup/export-csv?type=expenses"
            download
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between"
          >
            <span>Expense Ledger (.csv)</span>
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </a>
          <a
            href="/api/backup/export-csv?type=customers"
            download
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between"
          >
            <span>Customer Balances (.csv)</span>
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </a>
          <a
            href="/api/backup/export-csv?type=salaries"
            download
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between"
          >
            <span>Driver Payroll (.csv)</span>
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </a>
        </div>
      </div>

      {/* DEDICATED OFFICIAL PRINTABLE FINANCIAL STATEMENT (Visible in Print & On-Screen Audited Preview) */}
      <div
        id="printable-financial-statement"
        className="printable-document p-8 bg-white border border-slate-300 rounded-2xl text-slate-900 space-y-6 shadow-sm"
      >
        {/* Letterhead */}
        <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
              {settings?.businessName || 'NAYAK TRANSPORT'}
            </h1>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {settings?.tagline || 'Commercial Transport Fleet & Cargo Carriers'}
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              {settings?.address || 'Plot 104, Transport Nagar, Cuttack Road, Bhubaneswar, Odisha'}
            </p>
            <p className="text-[11px] text-slate-600 font-mono">
              GSTIN: {settings?.gstin || '21AAACV3600A1Z5'} &bull; Ph: {settings?.phone || '+91 99380 75395'} &bull; Email: {settings?.email || 'sushantan34@gmail.com'}
            </p>
          </div>

          <div className="sm:text-right bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <span className="font-black text-sm uppercase text-slate-900 block">
              Profit & Loss Statement
            </span>
            <span className="text-slate-600 block mt-0.5">
              Financial Period: <b>FY 2026-27</b>
            </span>
            <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
              Generated: {formatDateTimeIST(new Date().toISOString())}
            </span>
          </div>
        </div>

        {/* Section 1: Executive Financial Summary */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Section I &bull; Executive Revenue & Realization Summary
            </span>
            <span className="text-xs font-bold text-emerald-800">
              Net Operating Profit: {formatINR(summary.netOperatingProfit)} ({summary.profitMarginPercent || 0}%)
            </span>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Freight Billed</span>
              <span className="text-base font-black text-slate-900 block">{formatINR(summary.totalFreightBilled)}</span>
              <span className="text-[10px] text-slate-500">Recognized freight sales</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Cash Collections Received</span>
              <span className="text-base font-bold text-slate-800 block">{formatINR(summary.totalPaymentsReceived)}</span>
              <span className="text-[10px] text-slate-500">Collected in hand/bank</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Approved Operating Expenses</span>
              <span className="text-base font-bold text-amber-700 block">{formatINR(summary.totalOperatingExpenses)}</span>
              <span className="text-[10px] text-slate-500">Fleet operational costs</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Receivables Due</span>
              <span className="text-base font-black text-rose-700 block">{formatINR(summary.customerPendingDues)}</span>
              <span className="text-[10px] text-slate-500">Balance outstanding</span>
            </div>
          </div>
        </div>

        {/* Section 2: Mathematical Proof Equation */}
        <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
            Section II &bull; Verified Mathematical Reconciliation Equations
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-sans font-bold text-[11px] text-slate-700 uppercase block">Operating Profit Equation</span>
              <div className="flex justify-between"><span>Freight Billed:</span> <b>{formatINR(summary.totalFreightBilled)}</b></div>
              <div className="flex justify-between text-rose-700"><span>Less Operating Expenses:</span> <b>- {formatINR(summary.totalOperatingExpenses)}</b></div>
              <div className="flex justify-between text-emerald-800 font-black border-t border-slate-300 pt-1">
                <span>Net Operating Profit:</span> <span>= {formatINR(summary.netOperatingProfit)}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
              <span className="font-sans font-bold text-[11px] text-slate-700 uppercase block">Cash Liquidity Position</span>
              <div className="flex justify-between"><span>Customer Cash Inflow:</span> <b>{formatINR(summary.totalPaymentsReceived)}</b></div>
              <div className="flex justify-between text-amber-700"><span>Less Expenses & EMIs & Salaries:</span> <b>- {formatINR((summary.totalOperatingExpenses || 0) + (summary.totalEmiPayments || 0) + (summary.totalSalariesPaid || 0))}</b></div>
              <div className="flex justify-between text-blue-800 font-black border-t border-slate-300 pt-1">
                <span>Net Cash Surplus:</span> <span>= {formatINR(summary.netCashFlow)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Itemized Expense Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Section III &bull; Operating Expenditure Ledger by Head
            </span>
            <span className="text-xs font-bold text-slate-900">
              Total: {formatINR(summary.totalOperatingExpenses)}
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Expense Head</th>
                <th className="py-2.5 px-3 text-center">Vouchers Count</th>
                <th className="py-2.5 px-3 text-right">Disbursed (₹)</th>
                <th className="py-2.5 px-3 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseBreakdown.map((item: any) => (
                <tr key={item.categoryKey}>
                  <td className="py-2 px-3 font-semibold text-slate-800">{item.category}</td>
                  <td className="py-2 px-3 text-center font-mono text-slate-600">{item.count}</td>
                  <td className="py-2 px-3 text-right font-black text-slate-900">{formatINR(item.amount)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600">{item.percentage}%</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                <td className="py-2 px-3 text-slate-900">Total Operating Disbursements</td>
                <td className="py-2 px-3 text-center font-mono">{expenseBreakdown.reduce((sum: number, i: any) => sum + i.count, 0)}</td>
                <td className="py-2 px-3 text-right text-rose-700 text-sm font-black">{formatINR(summary.totalOperatingExpenses)}</td>
                <td className="py-2 px-3 text-right font-mono">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 4: Vehicle Fleet Profitability Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Section IV &bull; Vehicle-by-Vehicle ROI & Efficiency Ledger
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3 text-center">Trips</th>
                <th className="py-2.5 px-3 text-right">Distance</th>
                <th className="py-2.5 px-3 text-right font-bold text-slate-900">Freight Billed</th>
                <th className="py-2.5 px-3 text-right text-amber-700">Diesel</th>
                <th className="py-2.5 px-3 text-right text-slate-700">Workshop</th>
                <th className="py-2.5 px-3 text-right text-rose-700 font-bold">Total Expenses</th>
                <th className="py-2.5 px-3 text-right text-emerald-700 font-black">Net Profit</th>
                <th className="py-2.5 px-3 text-center">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicleProfitability.map((vp: any) => (
                <tr key={vp.vehicleId}>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-900 block font-mono">{vp.regNumber}</span>
                    <span className="text-[10px] text-slate-500">{vp.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">{vp.tripCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{vp.totalDistance} km</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatINR(vp.totalFreight)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-amber-700">{formatINR(vp.fuelCost)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatINR(vp.maintenanceCost)}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-rose-700">{formatINR(vp.totalExpenses)}</td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700">{formatINR(vp.netProfit)}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-emerald-800">{vp.profitMargin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 5: Statutory Certification & Signature Block */}
        <div className="pt-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <b>Statutory Certification:</b> This statement represents a mathematically reconciled calculation of commercial freight revenues, operational expense disbursements, fuel costs, toll taxes, and net business profitability. All figures are verified against underlying trip manifests, customer receipts, and approved expense vouchers.
          </div>

          <div className="grid grid-cols-3 gap-8 text-center text-xs text-slate-500 pt-6">
            <div className="border-t border-slate-300 pt-2">
              <span className="block font-semibold text-slate-800">Prepared By</span>
              <span className="text-[10px] text-slate-400">Fleet Accounts</span>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <span className="block font-semibold text-slate-800">Verified By</span>
              <span className="text-[10px] text-slate-400">Operations Manager</span>
            </div>
            <div className="border-t border-slate-300 pt-2">
              <span className="block font-bold text-slate-900">{settings?.ownerName || 'Fleet Owner'}</span>
              <span className="text-[10px] text-slate-500">Authorized Signatory & Seal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
