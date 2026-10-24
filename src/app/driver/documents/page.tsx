'use client';

import React, { useState, useEffect } from 'react';
import { FileCheck2, CreditCard, Shield, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function DriverDocumentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, []);

  const driver = data?.driver || {};
  const vehicle = data?.assignedVehicle;
  const docs = data?.vehicleDocs || [];

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Driving Licence & Vehicle Road Compliance
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Authorized certificates to present during RTO, traffic police, or state border checks
        </p>
      </div>

      {/* Driver Licence Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Commercial Driving Licence (DL)</h3>
          </div>
          <StatusBadge status={driver.dlStatus} size="sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">DL Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{driver.dlNumber}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Expiry Date</span>
            <span className="font-bold text-slate-900">{driver.dlExpiryDate}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Validity Remaining</span>
            <span className="font-bold text-slate-900">{driver.dlDaysRemaining} days</span>
          </div>
        </div>
      </div>

      {/* Assigned Vehicle Road Documents */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Assigned Vehicle Compliance {vehicle ? `(${vehicle.regNumber})` : ''}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Official RTO Records</span>
        </div>

        {docs.length > 0 ? (
          <div className="space-y-2.5">
            {docs.map((doc: any) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold uppercase text-slate-900">{doc.docType.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-slate-600 font-semibold">#{doc.docNumber}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">Expires: {doc.expiryDate}</p>
                </div>
                <StatusBadge status={doc.status} size="sm" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-4 text-center">No compliance documents uploaded for vehicle.</p>
        )}
      </div>
    </div>
  );
}
