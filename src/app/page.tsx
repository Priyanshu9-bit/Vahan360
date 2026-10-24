'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          if (data.user.role === 'admin') {
            router.replace('/admin');
          } else if (data.user.role === 'driver') {
            if (data.user.status === 'pending_approval') {
              router.replace('/approval-pending');
            } else if (data.user.status === 'suspended') {
              router.replace('/access-restricted');
            } else {
              router.replace('/driver/dashboard');
            }
          }
        } else {
          fetch('/api/auth/setup-admin')
            .then((r) => r.json())
            .then((sData) => {
              if (sData.canSetup) {
                router.replace('/setup');
              } else {
                router.replace('/login');
              }
            })
            .catch(() => router.replace('/login'));
        }
      })
      .catch(() => router.replace('/login'));
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-sm font-medium">Redirecting to Vahan360...</p>
    </div>
  );
}
