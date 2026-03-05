'use client';

import React, { memo } from 'react';
import { X } from 'lucide-react';

export interface WordHuntMPHeaderProps {
  score: number;
  onQuit: () => void;
  t: (key: string) => string;
}

export const WordHuntMPHeader = memo<WordHuntMPHeaderProps>(({
  score,
  onQuit,
  t,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 gap-2">
      {/* Spacer for layout balance */}
      <div className="w-10" />

      {/* Score Badge */}
      <div className="flex-1 flex justify-center">
        <div className="bg-neo-navy border-3 border-neo-black rounded-neo px-4 py-1.5 shadow-hard-sm">
          <span className="text-2xl font-black font-neo-display text-neo-yellow tabular-nums">
            {score}
          </span>
        </div>
      </div>

      {/* Quit Button */}
      <button
        onClick={onQuit}
        className="w-10 h-10 flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-red text-neo-cream shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-shadow"
        aria-label={t('common.quit')}
      >
        <X size={20} strokeWidth={3} />
      </button>
    </div>
  );
});

WordHuntMPHeader.displayName = 'WordHuntMPHeader';
