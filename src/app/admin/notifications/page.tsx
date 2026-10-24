'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Check,
  CheckCheck,
  Navigation2,
  Receipt,
  Users,
  DatabaseBackup,
  FileCheck2,
  Trash2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { formatDateTimeIST } from '@/lib/accounting';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
        const unread = json.unreadCount ?? 0;
        window.dispatchEvent(
          new CustomEvent('notifications-updated', { detail: { unreadCount: unread } })
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (res.ok) {
        const json = await res.json();
        const newUnread = json.unreadCount ?? 0;
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        window.dispatchEvent(
          new CustomEvent('notifications-updated', { detail: { unreadCount: newUnread } })
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkSingleRead = async (id: string, redirectLink?: string) => {
    try {
      const res = await fetch('/api/admin/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const json = await res.json();
        const newUnread = json.unreadCount ?? Math.max(0, unreadCount - 1);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        window.dispatchEvent(
          new CustomEvent('notifications-updated', { detail: { unreadCount: newUnread } })
        );
      }
    } catch (err) {
      console.error(err);
    }

    if (redirectLink) {
      router.push(redirectLink);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/notifications?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const json = await res.json();
        const newUnread = json.unreadCount ?? 0;
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        window.dispatchEvent(
          new CustomEvent('notifications-updated', { detail: { unreadCount: newUnread } })
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearRead = async () => {
    if (!confirm('Clear all read notifications from history?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/notifications?clearRead=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        const json = await res.json();
        const newUnread = json.unreadCount ?? 0;
        setNotifications((prev) => prev.filter((n) => !n.isRead));
        window.dispatchEvent(
          new CustomEvent('notifications-updated', { detail: { unreadCount: newUnread } })
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'driver_approval':
        return <Users className="w-4 h-4 text-amber-600" />;
      case 'expense_approval':
        return <Receipt className="w-4 h-4 text-blue-600" />;
      case 'doc_expiry':
        return <FileCheck2 className="w-4 h-4 text-rose-600" />;
      case 'trip_update':
        return <Navigation2 className="w-4 h-4 text-emerald-600" />;
      case 'backup_status':
        return <DatabaseBackup className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              In-App Notification Center
            </h2>
            {unreadCount > 0 ? (
              <span className="px-2.5 py-0.5 text-xs font-black bg-rose-100 text-rose-700 rounded-full border border-rose-200">
                {unreadCount} Unread
              </span>
            ) : (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Bell Clear
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time fleet activity alerts, driver approvals, expense submissions, and document expiries
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchNotifs}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            title="Refresh alerts"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-xs"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Mark All as Read</span>
            </button>
          )}

          {readCount > 0 && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleClearRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 transition-colors shadow-xs"
              title="Delete all read notifications from history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Read History</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Status Card when All Caught Up */}
      {unreadCount === 0 && notifications.length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-black text-emerald-900">
                All notifications are read — Bell icon is completely clear!
              </p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                The top navigation bell will stay quiet without any red badge until new driver, trip, or document events occur.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 hidden sm:block">
            0 Pending
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
            filter === 'unread'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 ? (
            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                filter === 'unread'
                  ? 'bg-rose-500 text-white'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {unreadCount}
            </span>
          ) : (
            <span
              className={`px-1.5 py-0.2 text-[10px] rounded-full font-bold ${
                filter === 'unread'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              0
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter('read')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filter === 'read'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Read ({readCount})
        </button>
      </div>

      {/* Notification Items */}
      <div className="space-y-3">
        {filteredNotifications.map((notif) => (
          <div
            key={notif.id}
            onClick={() => {
              if (!notif.isRead) {
                handleMarkSingleRead(notif.id);
              }
            }}
            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer group ${
              !notif.isRead
                ? 'bg-blue-50/50 border-blue-200 shadow-xs hover:bg-blue-50/80'
                : 'bg-white border-slate-200/90 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-xl border shrink-0 transition-colors ${
                  !notif.isRead
                    ? 'bg-white border-blue-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                {getIcon(notif.type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-xs ${
                      !notif.isRead
                        ? 'font-black text-slate-900'
                        : 'font-bold text-slate-700'
                    }`}
                  >
                    {notif.title}
                  </h4>
                  {!notif.isRead ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      Read
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {notif.message}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-300" />
                    <span>{formatDateTimeIST(notif.createdAt)}</span>
                  </div>
                  {notif.link && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkSingleRead(notif.id, notif.link);
                      }}
                      className="font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Open Module &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions on Item */}
            <div className="flex items-center gap-1 shrink-0">
              {!notif.isRead && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkSingleRead(notif.id);
                  }}
                  title="Mark as read"
                  className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNotification(notif.id);
                }}
                title="Delete notification"
                className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Empty States */}
        {filteredNotifications.length === 0 && !loading && (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            {filter === 'unread' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">No unread notifications</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  All alerts have been reviewed and marked as read. The notification bell is quiet.
                </p>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className="mt-4 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  View All History
                </button>
              </>
            ) : filter === 'read' ? (
              <>
                <BellOff className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No read notifications</p>
                <p className="text-xs text-slate-400 mt-1">
                  Once you review notifications, they will be archived here.
                </p>
              </>
            ) : (
              <>
                <BellOff className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  You are completely up to date. Activity alerts and reminders will appear here.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
