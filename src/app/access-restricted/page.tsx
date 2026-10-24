'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Phone } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function AccessRestrictedPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-md mx-auto relative z-10 w-full text-center">
        <div className="flex justify-center mb-6">
          <Logo size="lg" light showTagline />
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-5">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            Your commercial driver account has been suspended or restricted by the transport business administrator.
          </p>

          <div className="bg-slate-900/80 rounded-xl p-4 text-left border border-slate-700/60 mb-6 text-xs text-slate-300 space-y-2">
            <p className="font-semibold text-rose-300">Possible reasons:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Expired Commercial Driving Licence</li>
              <li>Pending administrative compliance review</li>
              <li>Vehicle reassignment or temporary fleet hiatus</li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Please reach out to the fleet owner at{' '}
            <span className="text-white font-semibold">+91 98765 43210</span> or{' '}
            <span className="text-white font-semibold">owner@vahan360.com</span> to resolve account status.
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
