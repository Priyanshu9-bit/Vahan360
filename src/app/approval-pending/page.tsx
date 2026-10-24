'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, ShieldCheck, Phone, CheckCircle, ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function ApprovalPendingPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-md mx-auto relative z-10 w-full text-center">
        <div className="flex justify-center mb-6">
          <Logo size="lg" light showTagline />
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Registration Pending Approval</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            Thank you for registering with Vahan360 Fleet. Your driver profile and driving licence documents have been submitted to the business owner for verification.
          </p>

          <div className="bg-slate-900/80 rounded-xl p-4 text-left border border-slate-700/60 mb-6 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Application details received securely</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Awaiting Admin driving licence verification</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Vehicle & trip access will unlock upon approval</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            For urgent trip assignments, contact the fleet manager at{' '}
            <span className="text-white font-semibold">+91 98765 43210</span>.
          </p>

          <Link
            href="/login"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Login Screen</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
