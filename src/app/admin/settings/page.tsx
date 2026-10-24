'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Save,
  Globe,
  Building2,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Lock,
} from 'lucide-react';
import { Modal } from '@/components/Modal';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ownership Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferData, setTransferData] = useState({
    newName: '',
    newEmail: '',
    newPhone: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }

    setChangingPassword(true);
    setPasswordMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMsg({ type: 'error', text: data.error || 'Failed to update password.' });
      } else {
        setPasswordMsg({ type: 'success', text: 'Password changed successfully!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const json = await res.json();
        setSettings(json.settings);
        setAdminUser(json.adminUser);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Business settings updated successfully.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.newName || !transferData.newEmail || !transferData.newPhone || !transferData.newPassword) {
      alert('Please fill all mandatory fields.');
      return;
    }

    if (transferData.newPassword !== transferData.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'transfer_ownership',
          ...transferData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTransferModalOpen(false);
        alert('Ownership transferred successfully! Please sign in with the new Owner credentials.');
        window.location.href = '/login';
      } else {
        alert(data.error || 'Failed to transfer ownership');
      }
    } catch {
      alert('Error transferring ownership');
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Business Settings & Fleet Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Company credentials, regional parameters, GST details, and owner succession
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-bold">&times;</button>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Business Profile */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Transport Enterprise Details</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Enterprise Trade Name
              </label>
              <input
                type="text"
                required
                value={settings?.businessName || ''}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Brand Tagline
              </label>
              <input
                type="text"
                value={settings?.tagline || ''}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Mobile / WhatsApp
              </label>
              <input
                type="tel"
                value={settings?.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Official Business Email
              </label>
              <input
                type="email"
                value={settings?.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                GSTIN (Indian Goods & Services Tax)
              </label>
              <input
                type="text"
                value={settings?.gstin || ''}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Interface Language
              </label>
              <select
                value={settings?.language || 'en'}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English (Default)</option>
                <option value="hi">हिन्दी (Hindi - Ready)</option>
                <option value="or">ଓଡ଼ିଆ (Odia - Ready)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Registered Head Office / Depot Address
            </label>
            <textarea
              rows={2}
              value={settings?.address || ''}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Enterprise Settings'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Change Login Password</h3>
              <p className="text-[11px] text-slate-500">Update your Fleet Owner password anytime</p>
            </div>
          </div>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {passwordMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{passwordMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="Enter current password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="At least 6 characters"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Re-type new password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{changingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Single Admin Ownership & Security Transfer Section */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Designated Single-Admin Owner Account</h3>
              <p className="text-[11px] text-slate-400">Strict single-admin architecture with secure succession</p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
            Active Owner
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Owner</span>
            <span className="font-bold text-white text-sm">{adminUser?.name}</span>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Login Email</span>
            <span className="font-mono text-slate-300">{adminUser?.email}</span>
          </div>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Phone</span>
            <span className="font-semibold text-slate-300">{adminUser?.phone}</span>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            In accordance with system security rules, exactly one active Admin is permitted. If the transport business is being transferred to a new proprietor, you can perform a secure ownership transfer.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTransferModalOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
        >
          Transfer Business Ownership &rarr;
        </button>
      </div>

      {/* Transfer Ownership Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Fleet Business Ownership"
        subtitle="This action will decommission current Admin credentials and grant full business authority to the new owner."
        maxWidth="lg"
      >
        <form onSubmit={handleTransferOwnership} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <b>Warning:</b> Once completed, your current login credentials will be deactivated and full business management rights will be transferred immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Owner Full Name *
              </label>
              <input
                type="text"
                required
                value={transferData.newName}
                onChange={(e) => setTransferData({ ...transferData, newName: e.target.value })}
                placeholder="e.g. Ashok Mohapatra"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                New Owner Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={transferData.newPhone}
                onChange={(e) => setTransferData({ ...transferData, newPhone: e.target.value })}
                placeholder="+91 94370 99881"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              New Owner Email Address *
            </label>
            <input
              type="email"
              required
              value={transferData.newEmail}
              onChange={(e) => setTransferData({ ...transferData, newEmail: e.target.value })}
              placeholder="newowner@vahan360.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Set New Admin Password *
              </label>
              <input
                type="password"
                required
                value={transferData.newPassword}
                onChange={(e) => setTransferData({ ...transferData, newPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                required
                value={transferData.confirmPassword}
                onChange={(e) => setTransferData({ ...transferData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-md cursor-pointer"
            >
              Execute Ownership Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
