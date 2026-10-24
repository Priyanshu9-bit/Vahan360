'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Navigation2,
  Receipt,
  Wallet,
  FileCheck2,
  Bell,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from './Logo';
import { InstallAppButton } from './InstallAppButton';

interface DriverSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  driverName?: string;
  assignedReg?: string;
}

export function DriverSidebar({
  isOpen = true,
  onClose,
  driverName = 'Rajesh Kumar',
  assignedReg,
}: DriverSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      router.push('/login');
    }
  };

  const navItems = [
    { label: 'My Dashboard', href: '/driver/dashboard', icon: LayoutDashboard },
    { label: 'My Assigned Trips', href: '/driver/trips', icon: Navigation2 },
    { label: 'Submit & Track Expenses', href: '/driver/expenses', icon: Receipt },
    { label: 'My Salary & Advances', href: '/driver/salary', icon: Wallet },
    { label: 'Vehicle & DL Compliance', href: '/driver/documents', icon: FileCheck2 },
    { label: 'Notifications', href: '/driver/notifications', icon: Bell },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-18 px-5 border-b border-slate-800 bg-slate-950/40">
          <Link href="/driver/dashboard" onClick={onClose} className="focus:outline-hidden">
            <Logo size="md" light showTagline />
          </Link>
        </div>

        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Driver Portal
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/driver/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-200" />}
              </Link>
            );
          })}
        </div>

        {/* Assigned Vehicle Pill */}
        {assignedReg && (
          <div className="px-4 py-2 mx-3 mb-2 rounded-lg bg-blue-950/60 border border-blue-800/40 text-[11px] text-blue-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase text-slate-400 block font-semibold">Assigned Vehicle</span>
              <span className="font-bold text-white">{assignedReg}</span>
            </div>
          </div>
        )}

        {/* Driver Profile & App Install */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2.5">
          <InstallAppButton />
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-xs shrink-0">
                {driverName.charAt(0)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{driverName}</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[10px] text-slate-400">Approved Commercial Driver</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
