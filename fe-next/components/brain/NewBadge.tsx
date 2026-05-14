'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface NewBadgeProps {
  className?: string;
}

/**
 * NewBadge Component
 *
 * Displays a pulsing "NEW!" badge for brain training scores after the first 1-2 games.
 * Replaces trend arrows to indicate baseline establishment rather than trend data.
 */
export default function NewBadge({ className }: NewBadgeProps) {
  const { t } = useLanguage();

  return (
    <m.div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-neo border-2 border-neo-black',
        'bg-neo-lime',
        className
      )}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{
        repeat: Infinity,
        duration: 2,
        ease: "easeInOut"
      }}
    >
      <Sparkles className="w-3 h-3 text-neo-black" />
      <span className="text-[10px] font-black uppercase text-neo-black">
        {t('brain.newBadge')}
      </span>
    </m.div>
  );
}
