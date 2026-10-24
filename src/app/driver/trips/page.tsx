'use client';

import React, { useState, useEffect } from 'react';
import { Navigation2, Play, Check, MapPin, Phone, Truck } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';

export default function DriverTripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [odometerEnd, setOdometerEnd] = useState('');

  const fetchTrips = async () => {
    try {
      const res = await fetch('/api/driver/dashboard');
      if (res.ok) {
        const json = await res.json();
        setTrips(json.trips || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleStartTrip = async (id: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripStatus: 'in_progress' }),
      });
      if (res.ok) fetchTrips();
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
        fetchTrips();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to complete trip');
      }
    } catch {
      alert('Error completing trip');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          My Assigned Commercial Trips
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Pickups, deliveries, cargo details, and real-time run status updates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-black font-mono text-blue-700">{t.tripNumber}</span>
                <StatusBadge status={t.tripStatus} size="sm" />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Loading From</span>
                    <span className="font-semibold text-slate-800">{t.loadingLocation}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Delivery Destination</span>
                    <span className="font-semibold text-slate-800">{t.deliveryLocation}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 my-3 text-xs space-y-1">
                <div>Customer Phone: <b>{t.customerPhone}</b></div>
                <div>Goods: <b>{t.goodsDescription}</b> ({t.weightKg} kg)</div>
                <div>Starting Odo: <b className="font-mono">{t.odometerStart} km</b></div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              {t.tripStatus === 'assigned' && (
                <button
                  onClick={() => handleStartTrip(t.id)}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Delivery Run</span>
                </button>
              )}
              {t.tripStatus === 'in_progress' && (
                <button
                  onClick={() => {
                    setSelectedTrip(t);
                    setOdometerEnd(String(t.odometerStart + 50));
                    setCompleteModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Complete Run</span>
                </button>
              )}
              {t.tripStatus === 'completed' && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
                  Run Completed & Acknowledged
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md"
            >
              Confirm Delivery
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
