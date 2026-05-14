'use client';

import React from 'react';
import { m } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface DeltaDisplayProps {
  delta: number;
  className?: string;
}

/**
 * Delta Display Component
 *
 * Shows the score change from the previous game with:
 * - Up/down arrow based on direction
 * - Color coding (green for positive, red for negative, gray for no change)
 * - Delta value (+3, -2, etc.)
 */
export default function DeltaDisplay({ delta, className }: DeltaDisplayProps) {
  const { t } = useLanguage();

  // Determine styling based on delta
  const isPositive = delta > 0;
  const isNegative = delta < 0;
  const isNeutral = delta === 0;

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : null;

  const colorClass = isPositive
    ? 'bg-neo-green text-neo-black'
    : isNegative
    ? 'bg-amber-400 text-neo-black'
    : 'bg-gray-400 text-neo-black';

  const textColorClass = isPositive
    ? 'text-neo-green'
    : isNegative
    ? 'text-amber-400'
    : 'text-gray-400';

  return (
    <m.div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-neo border-2 border-neo-black',
        colorClass,
        className
      )}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", damping: 15 }}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span className="text-[10px] font-black uppercase">
        {isPositive && '+'}{delta}
      </span>
    </m.div>
  );
}
