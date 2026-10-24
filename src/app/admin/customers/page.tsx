'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation2, ArrowRight } from 'lucide-react';

export default function CustomersRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/admin/trips');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="py-20 text-center max-w-lg mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-200">
        <Navigation2 className="w-7 h-7" />
      </div>
      <h2 className="text-lg font-black text-slate-900 mb-2">
        Consolidated into Trips & Freight
      </h2>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed">
        You no longer need a separate customer panel. Customer names and phone numbers are now typed directly when booking trips, with automatic suggestions for returning customers.
      </p>
      <Link
        href="/admin/trips"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs"
      >
        <span>Open Trips & Freight Panel</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
