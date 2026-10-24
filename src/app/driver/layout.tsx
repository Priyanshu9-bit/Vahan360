'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DriverSidebar } from '@/components/DriverSidebar';
import { Navbar } from '@/components/Navbar';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [driverUser, setDriverUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  const fetchUnreadNotifs = useCallback(async () => {
    try {
      const notifRes = await fetch('/api/admin/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setUnreadCount(notifData.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function checkDriverAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'driver') {
          // Owner account detected attempting to access driver portal
          setRoleError('Owner account detected. The Driver Portal is reserved exclusively for registered commercial drivers.');
          router.replace('/admin');
          return;
        }

        if (data.user?.status === 'pending_approval') {
          router.replace('/approval-pending');
          return;
        }
        if (data.user?.status === 'suspended') {
          router.replace('/access-restricted');
          return;
        }

        setDriverUser(data);
        await fetchUnreadNotifs();
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    checkDriverAuth();
  }, [router, fetchUnreadNotifs]);

  // Synchronize on pathname changes
  useEffect(() => {
    if (driverUser?.user?.role === 'driver') {
      fetchUnreadNotifs();
    }
  }, [pathname, fetchUnreadNotifs, driverUser?.user?.role]);

  // Real-time listener for notification status updates
  useEffect(() => {
    if (driverUser?.user?.role !== 'driver') return;

    const handleUpdate = (e: any) => {
      if (e?.detail?.unreadCount !== undefined) {
        setUnreadCount(e.detail.unreadCount);
      } else {
        fetchUnreadNotifs();
      }
    };

    window.addEventListener('notifications-updated', handleUpdate);
    window.addEventListener('focus', fetchUnreadNotifs);
    const interval = setInterval(fetchUnreadNotifs, 30000);

    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
      window.removeEventListener('focus', fetchUnreadNotifs);
      clearInterval(interval);
    };
  }, [fetchUnreadNotifs, driverUser?.user?.role]);

  // 1. Loading State
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Driver Portal...</p>
        </div>
      </div>
    );
  }

  // 2. STRICT SECURITY GUARD: If user is not verified as driver, NEVER render driver portal or children!
  if (!driverUser || driverUser.user?.role !== 'driver' || roleError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight mb-2">
            Driver Portal Restricted
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            You are signed in as the Fleet Owner (Admin). The Driver Portal is reserved exclusively for commercial drivers to manage assigned vehicles and submit on-road trip expenses. Fleet Owners manage operations from the Owner Console.
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => router.replace('/admin')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
            >
              <span>Return to Fleet Owner Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.replace('/login');
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authenticated Driver View
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex relative transition-colors duration-200">
      <DriverSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        driverName={driverUser?.user?.name || 'Driver'}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(true)}
          title="Driver Console"
          subtitle="My assigned vehicle, trips, and expense submissions"
          unreadCount={unreadCount}
          userRole="driver"
          userName={driverUser?.user?.name || 'Driver'}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
