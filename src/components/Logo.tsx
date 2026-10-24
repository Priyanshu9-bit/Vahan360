import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  light?: boolean;
}

export function Logo({ className = '', size = 'md', showTagline = false, light = false }: LogoProps) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Original Vehicle-Inspired Fleet Emblem with 360 Ring */}
      <div
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br ${
          light ? 'from-blue-500 to-indigo-600 text-white' : 'from-blue-700 to-navy-card text-white'
        } ${iconSizes[size]} shadow-md shadow-blue-900/20`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5/6 h-5/6 p-0.5"
        >
          {/* Pickup truck cab and cargo bed silhouette */}
          <path d="M3 13h2l2-4h7l2 4h4v3H3v-3z" />
          <path d="M14 9l1.5 4H19" />
          {/* 360 Fleet Compass Ring */}
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
          <path d="M5 6.5A8 8 0 0 1 19 6.5" strokeDasharray="2 2" strokeWidth="1.5" />
        </svg>
        {/* Active fleet ping indicator */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight ${textSizes[size]} ${light ? 'text-white' : 'text-slate-900'}`}>
            VAHAN<span className="text-blue-600">360</span>
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-blue-100 text-blue-800 border border-blue-200">
            FLEET
          </span>
        </div>
        {showTagline && (
          <span className={`text-[11px] font-medium tracking-tight mt-0.5 ${light ? 'text-slate-300' : 'text-slate-500'}`}>
            Complete Control of Your Fleet.
          </span>
        )}
      </div>
    </div>
  );
}
