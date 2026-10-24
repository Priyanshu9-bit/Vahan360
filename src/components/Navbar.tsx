'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Bell,
  BellOff,
  DatabaseBackup,
  Globe,
  Shield,
  Check,
  CheckCheck,
  ArrowRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { formatDateTimeIST } from '@/lib/accounting';

interface NavbarProps {
  onToggleSidebar?: () => void;
  title?: string;
  subtitle?: string;
  unreadCount?: number;
  userRole?: 'admin' | 'driver';
  userName?: string;
}

export function Navbar({
  onToggleSidebar,
  title = 'Fleet Operations',
  subtitle,
  unreadCount = 0,
  userRole = 'admin',
  userName = 'Sushanta Nayak',
}: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [dropdownNotifs, setDropdownNotifs] = useState<any[]>([]);
  const [currentUnread, setCurrentUnread] = useState(unreadCount);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync prop changes
  useEffect(() => {
    setCurrentUnread(unreadCount);
  }, [unreadCount]);

  // Close dropdown on outside click or Esc
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dropdownOpen]);

  // Fetch notifications when opening dropdown
  const fetchRecentNotifs = async () => {
    setLoadingNotifs(true);
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setDropdownNotifs(data.notifications || []);
        if (typeof data.unreadCount === 'number') {
          setCurrentUnread(data.unreadCount);
        }
      }
    } catch (e) {
      console.error('Failed to load notifications in dropdown', e);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleToggleDropdown = () => {
    if (!dropdownOpen) {
      fetchRecentNotifs();
    }
    setDropdownOpen((prev) => !prev);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        const json = await res.json();
        const newCount = json.unreadCount ?? 0;
        setCurrentUnread(newCount);
        setDropdownNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
        window.dispatchEvent(
          new CustomEvent('notifications-updated', { detail: { unreadCount: newCount } })
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSingleRead = async (id: string, link?: string) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const json = await res.json();
        const newCount = json.unreadCount ?? Math.max(0, currentUnread - 1);
        setCurrentUnread(newCount);
        setDropdownNotifs((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        window.dispatchEvent(
          new CustomEvent('notifications-updated', { detail: { unreadCount: newCount } })
        );
      }
    } catch (err) {
      console.error(err);
    }

    if (link) {
      setDropdownOpen(false);
      router.push(link);
    }
  };

  const notificationsUrl =
    userRole === 'admin' ? '/admin/notifications' : '/driver/notifications';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
            {title}
            {userRole === 'admin' && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <Shield className="w-3 h-3 text-blue-600" /> Owner Console
              </span>
            )}
          </h1>
          {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language selector toggle */}
        <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200">
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="hidden sm:inline">Lang:</span>
          <span className="text-blue-600 font-bold">EN</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400 hover:text-slate-700 cursor-pointer" title="Hindi (Ready)">HI</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-400 hover:text-slate-700 cursor-pointer" title="Odia (Ready)">OD</span>
        </div>

        {/* Backup button quick link (Admin only) */}
        {userRole === 'admin' && (
          <Link
            href="/admin/backup"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
          >
            <DatabaseBackup className="w-3.5 h-3.5 text-blue-600" />
            <span>Backup & Restore</span>
          </Link>
        )}

        {/* Notifications Bell with Interactive Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleToggleDropdown}
            className={`relative p-2 rounded-xl transition-all duration-150 ${
              dropdownOpen
                ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500/20'
                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
            }`}
            title={
              currentUnread > 0
                ? `${currentUnread} unread notification${currentUnread > 1 ? 's' : ''}`
                : 'No notifications (All caught up)'
            }
          >
            <Bell className={`w-5 h-5 ${currentUnread > 0 ? 'text-slate-800' : 'text-slate-500'}`} />
            {currentUnread > 0 ? (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-black text-white bg-rose-500 rounded-full animate-bounce shadow-xs">
                {currentUnread > 9 ? '9+' : currentUnread}
              </span>
            ) : null}
          </button>

          {/* Dropdown Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-900 tracking-tight">Notifications</h3>
                  {currentUnread > 0 ? (
                    <span className="px-2 py-0.5 text-[10px] font-black bg-rose-100 text-rose-700 rounded-full">
                      {currentUnread} new
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> No unread
                    </span>
                  )}
                </div>

                {currentUnread > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {loadingNotifs ? (
                  <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    <span className="text-xs font-medium">Checking alerts...</span>
                  </div>
                ) : dropdownNotifs.length === 0 ? (
                  <div className="py-10 px-4 text-center">
                    <BellOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">No notifications</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      You are completely up to date.
                    </p>
                  </div>
                ) : (
                  <>
                    {currentUnread === 0 && (
                      <div className="px-4 py-2 bg-emerald-50/60 border-b border-emerald-100 flex items-center gap-2 text-[11px] font-semibold text-emerald-700">
                        <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                        <span>All notifications have been read. Bell will stay quiet.</span>
                      </div>
                    )}
                    {dropdownNotifs.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleMarkSingleRead(notif.id, notif.link)}
                        className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                          !notif.isRead
                            ? 'bg-blue-50/40 hover:bg-blue-50/70'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 transition-opacity ${
                            !notif.isRead ? 'bg-blue-600' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs leading-snug line-clamp-1 ${
                              !notif.isRead
                                ? 'font-black text-slate-900'
                                : 'font-semibold text-slate-700'
                            }`}
                          >
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span>{formatDateTimeIST(notif.createdAt)}</span>
                          </div>
                        </div>

                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkSingleRead(notif.id);
                            }}
                            title="Mark as read"
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-white transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200/80 text-center">
                <Link
                  href={notificationsUrl}
                  onClick={() => setDropdownOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 w-full py-1.5 rounded-lg hover:bg-blue-50/60 transition-colors"
                >
                  <span>Open Full Notification Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {userName.charAt(0)}
          </div>
          <div className="hidden lg:block text-left">
            <span className="block text-xs font-bold text-slate-800 leading-none">{userName}</span>
            <span className="text-[10px] font-medium text-slate-500 capitalize">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
