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
  ShieldCheck,
  Database,
  Cloud,
  RefreshCw,
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

  // 6-digit Master Security PIN state
  const [pinData, setPinData] = useState({
    pin: '',
    confirmPin: '',
    currentPassword: '',
  });
  const [savingPin, setSavingPin] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MongoDB Cloud Database state
  const [mongoStatus, setMongoStatus] = useState<any>(null);
  const [syncingMongo, setSyncingMongo] = useState(false);
  const [mongoMsg, setMongoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchMongoStatus = async () => {
    try {
      const res = await fetch('/api/admin/mongodb');
      if (res.ok) {
        const json = await res.json();
        setMongoStatus(json);
      }
    } catch {}
  };

  const handleSyncMongo = async () => {
    setSyncingMongo(true);
    setMongoMsg(null);
    try {
      const res = await fetch('/api/admin/mongodb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_now' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMongoMsg({ type: 'success', text: data.message });
      fetchMongoStatus();
    } catch (err: any) {
      setMongoMsg({ type: 'error', text: err.message || 'Sync failed.' });
    } finally {
      setSyncingMongo(false);
    }
  };

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

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pinData.pin.trim())) {
      setPinMsg({ type: 'error', text: 'PIN must be exactly 6 numeric digits (0-9).' });
      return;
    }
    if (pinData.pin !== pinData.confirmPin) {
      setPinMsg({ type: 'error', text: 'Security PIN and Confirm PIN do not match.' });
      return;
    }
    if (!pinData.currentPassword) {
      setPinMsg({ type: 'error', text: 'Please enter your current admin password to verify your identity.' });
      return;
    }

    setSavingPin(true);
    setPinMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_security_pin',
          pin: pinData.pin.trim(),
          currentPassword: pinData.currentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinMsg({ type: 'error', text: data.error || 'Failed to save Security PIN.' });
      } else {
        setPinMsg({ type: 'success', text: '6-digit Master Security PIN saved and active!' });
        setPinData({ pin: '', confirmPin: '', currentPassword: '' });
        fetchSettings();
      }
    } catch {
      setPinMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSavingPin(false);
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
    fetchMongoStatus();
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

      {/* 6-Digit Master Security PIN Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">6-Digit Master Security PIN</h3>
              <p className="text-[11px] text-slate-500">
                Secondary authorization code required to delete vehicles or restore backups
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto ${
              adminUser?.hasSecurityPin
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {adminUser?.hasSecurityPin ? '✓ PIN Active & Protected' : 'PIN Not Configured (Using Password)'}
          </span>
        </div>

        {pinMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              pinMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {pinMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{pinMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSavePin} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New 6-Digit PIN *
              </label>
              <input
                type="password"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                value={pinData.pin}
                onChange={(e) => setPinData({ ...pinData, pin: e.target.value.replace(/\D/g, '') })}
                placeholder="e.g. 729410"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono tracking-widest text-center text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm 6-Digit PIN *
              </label>
              <input
                type="password"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                value={pinData.confirmPin}
                onChange={(e) => setPinData({ ...pinData, confirmPin: e.target.value.replace(/\D/g, '') })}
                placeholder="Re-enter 6-digit PIN"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono tracking-widest text-center text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Current Admin Password *
              </label>
              <input
                type="password"
                required
                value={pinData.currentPassword}
                onChange={(e) => setPinData({ ...pinData, currentPassword: e.target.value })}
                placeholder="Required to set/change PIN"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-400">
              Only numbers (0-9). This PIN is prompted before destructive actions like vehicle deletion.
            </span>
            <button
              type="submit"
              disabled={savingPin}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 shrink-0 self-end sm:self-auto"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{savingPin ? 'Saving PIN...' : 'Save Security PIN'}</span>
            </button>
          </div>
        </form>
      </div>

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

      {/* Cloud Database (MongoDB Atlas) Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cloud Database (MongoDB Atlas)</h3>
              <p className="text-[11px] text-slate-500">
                Permanent, high-performance cloud storage ensuring data is never lost during Render restarts
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto ${
              mongoStatus?.connected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : mongoStatus?.configured
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {mongoStatus?.connected
              ? `✓ Connected (${mongoStatus.databaseName})`
              : mongoStatus?.configured
              ? '✕ Connection Error'
              : 'Local Filesystem Mode'}
          </span>
        </div>

        {mongoMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              mongoMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {mongoMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{mongoMsg.text}</span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-start gap-2.5">
            <Cloud className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-800">
                {mongoStatus?.connected
                  ? 'Cloud Synchronization Active'
                  : 'How to connect your free MongoDB Atlas database on Render:'}
              </p>
              {mongoStatus?.connected ? (
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Every vehicle, driver, trip, and payment is automatically saved to MongoDB Atlas in real time. Your business data is safely preserved across all server redeploys and restarts.
                </p>
              ) : (
                <ol className="list-decimal pl-4 space-y-1 text-slate-600 text-[11px] leading-relaxed">
                  <li>Create a free cluster on <strong className="text-blue-600">mongodb.com/cloud/atlas</strong></li>
                  <li>Copy your connection URI (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">mongodb+srv://user:pass@cluster.mongodb.net/vahan360</code>)</li>
                  <li>In your Render Dashboard, go to <strong>Environment &rarr; Add Environment Variable</strong>: Key: <code className="font-mono text-[10px] font-bold">MONGODB_URI</code></li>
                  <li>Render will automatically deploy with 100% permanent cloud persistence!</li>
                </ol>
              )}
            </div>
          </div>

          {mongoStatus?.connected && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center">
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Cloud Vehicles</span>
                <span className="text-sm font-extrabold text-slate-800">{mongoStatus.cloudVehiclesCount || 0}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Cloud Trips</span>
                <span className="text-sm font-extrabold text-slate-800">{mongoStatus.cloudTripsCount || 0}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Cloud Drivers</span>
                <span className="text-sm font-extrabold text-slate-800">{mongoStatus.cloudDriversCount || 0}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Status</span>
                <span className="text-sm font-extrabold text-emerald-600">Live Sync</span>
              </div>
            </div>
          )}
        </div>

        {mongoStatus?.connected && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSyncMongo}
              disabled={syncingMongo}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingMongo ? 'animate-spin' : ''}`} />
              <span>{syncingMongo ? 'Syncing to Cloud...' : 'Backup Current Database to MongoDB Atlas Now'}</span>
            </button>
          </div>
        )}
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
