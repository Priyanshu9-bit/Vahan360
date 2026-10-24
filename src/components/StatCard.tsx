import React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'navy';
  href?: string;
  badge?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  href,
  badge,
}: StatCardProps) {
  const colorMap = {
    blue: {
      bg: 'bg-white',
      border: 'border-slate-200/80 hover:border-blue-300',
      iconBg: 'bg-blue-50 text-blue-600',
      accent: 'text-blue-600',
    },
    green: {
      bg: 'bg-white',
      border: 'border-slate-200/80 hover:border-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-600',
      accent: 'text-emerald-600',
    },
    amber: {
      bg: 'bg-white',
      border: 'border-slate-200/80 hover:border-amber-300',
      iconBg: 'bg-amber-50 text-amber-600',
      accent: 'text-amber-600',
    },
    red: {
      bg: 'bg-white',
      border: 'border-slate-200/80 hover:border-rose-300',
      iconBg: 'bg-rose-50 text-rose-600',
      accent: 'text-rose-600',
    },
    navy: {
      bg: 'bg-slate-900 text-white',
      border: 'border-slate-800 hover:border-blue-500',
      iconBg: 'bg-slate-800 text-blue-400',
      accent: 'text-blue-400',
    },
  };

  const current = colorMap[variant];

  const content = (
    <div
      className={`relative p-5 rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md ${
        current.bg
      } ${current.border} ${href ? 'cursor-pointer group' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wider ${variant === 'navy' ? 'text-slate-400' : 'text-slate-500'}`}>
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold tracking-tight ${variant === 'navy' ? 'text-white' : 'text-slate-900'}`}>
              {value}
            </span>
            {badge && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className={`mt-1.5 text-xs ${variant === 'navy' ? 'text-slate-400' : 'text-slate-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${current.iconBg} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
