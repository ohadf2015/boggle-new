'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Calendar } from 'lucide-react';

interface EmptyStateProps {
  t: (key: string) => string;
}

export function EmptyState({ t }: EmptyStateProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 bg-neo-navy-light/30 rounded-neo border-neo border-black"
    >
      <Calendar className="w-16 h-16 text-slate-500 mb-4" />
      <h3 className="text-xl font-neo-display text-slate-400 mb-2">
        {t('admin.todayGames.noGames')}
      </h3>
      <p className="text-slate-500">
        {t('admin.todayGames.noGamesHint')}
      </p>
    </m.div>
  );
}
