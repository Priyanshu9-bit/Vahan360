'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { formatDateTimeIST } from '@/lib/accounting';

export default function DriverNotificationsPage() {
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

  const handleClearRead = async () => {
    if (!confirm('Clear read notifications from history?')) return;
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

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Driver Notifications
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
            Trip assignments, expense approvals, and salary disbursement notices
          </p>
        </div>

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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-300 hover:text-rose-600 hover:border-rose-300 transition-colors shadow-xs"
              title="Delete read notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Status Card when All Caught Up */}
      {unreadCount === 0 && notifications.length > 0 && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-black text-emerald-900">
              All notifications read — Bell icon is clean
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              The notification bell in your top bar is quiet. New trip assignments or salary notices will alert you.
            </p>
          </div>
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
            className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer group ${
              !notif.isRead
                ? 'bg-blue-50/50 border-blue-200 shadow-xs hover:bg-blue-50/80'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl border shrink-0 ${
                  !notif.isRead
                    ? 'bg-white border-blue-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Bell className={`w-4 h-4 ${!notif.isRead ? 'text-blue-600' : 'text-slate-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-xs ${
                      !notif.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-700'
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
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{notif.message}</p>
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
                      Open &rarr;
                    </button>
                  )}
                </div>
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
                className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors shrink-0"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {filteredNotifications.length === 0 && !loading && (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            {filter === 'unread' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-slate-800">No unread notifications</p>
                <p className="text-xs text-slate-400 mt-1">
                  You are all caught up! The bell will stay quiet.
                </p>
              </>
            ) : (
              <>
                <BellOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">No notifications.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You are completely up to date.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
