'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  /** When set, the card is a button (e.g. tap a mode card to filter by it). */
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({ label, value, icon, onClick, active }: StatCardProps) {
  const body = (
    <>
      {icon}
      <div className="min-w-0 text-start">
        <div className="text-lg sm:text-xl font-neo-display text-neo-white leading-tight">{value.toLocaleString()}</div>
        <div className="text-xs text-slate-400 truncate">{label}</div>
      </div>
    </>
  );
  const cls = `flex-shrink-0 min-w-[120px] sm:min-w-0 bg-neo-navy-light/50 rounded-neo border-neo p-2.5 sm:p-3 flex items-center gap-2.5 sm:gap-3 ${
    active ? 'border-neo-lime' : 'border-black'
  }`;
  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`${cls} hover:border-neo-lime/60 transition-colors`}>
      {body}
    </button>
  );
}
