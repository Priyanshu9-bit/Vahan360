'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const fetchUnreadNotifs = useCallback(async () => {
    try {
      const notifRes = await fetch('/api/admin/notifications');
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setUnreadNotifs(notifData.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.replace('/login');
          return;
        }
        const data = await res.json();
        if (data.user?.role !== 'admin') {
          // Driver detected attempting to access owner panel
          setAuthError('Driver account detected. Access to the Owner Console is strictly restricted to the Fleet Owner.');
          router.replace('/access-restricted');
          return;
        }
        setUser(data.user);
        await fetchUnreadNotifs();
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router, fetchUnreadNotifs]);

  // Synchronize unread notifications on route changes
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUnreadNotifs();
    }
  }, [pathname, fetchUnreadNotifs, user?.role]);

  // Real-time listener for notification status changes & periodic sync
  useEffect(() => {
    if (user?.role !== 'admin') return;

    const handleUpdate = (e: any) => {
      if (e?.detail?.unreadCount !== undefined) {
        setUnreadNotifs(e.detail.unreadCount);
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
  }, [fetchUnreadNotifs, user?.role]);

  // 1. Loading State
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Verifying Fleet Owner Credentials...</p>
        </div>
      </div>
    );
  }

  // 2. STRICT SECURITY GUARD: If user is not verified as admin, NEVER render owner console or children!
  if (!user || user.role !== 'admin' || authError) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-5 shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight mb-2">
            Owner Console Restricted
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            You are currently signed in with commercial driver credentials. Fleet financial records, vehicle acquisitions, driver payroll, and business settings are strictly accessible only by the verified transport business owner.
          </p>
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => router.replace('/driver/dashboard')}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
            >
              <span>Go to My Driver Portal</span>
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

  // 3. Authenticated Fleet Owner View
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex relative transition-colors duration-200">
      {/* Sidebar for Desktop & Drawer for Mobile */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(true)}
          title="Fleet Operations Console"
          subtitle="Real-time commercial vehicle tracking & accounting"
          unreadCount={unreadNotifs}
          userRole="admin"
          userName={user?.name || 'Owner'}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
