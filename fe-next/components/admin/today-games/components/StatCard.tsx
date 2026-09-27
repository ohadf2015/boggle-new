'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-3 flex items-center gap-3">
      {icon}
      <div>
        <div className="text-xl font-neo-display text-neo-white">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </div>
  );
}
