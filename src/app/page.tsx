'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { Logo } from '@/components/Logo';

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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
      <Logo size="lg" light />
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
