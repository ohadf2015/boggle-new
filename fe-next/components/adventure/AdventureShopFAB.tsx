'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Hammer, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdventureShopFABProps {
  isRTL: boolean;
  gold: number;
  onOpenShop: () => void;
  t: (key: string) => string;
}

export default function AdventureShopFAB({
  isRTL,
  gold,
  onOpenShop,
  t,
}: AdventureShopFABProps): React.JSX.Element {
  const formattedGold = gold.toLocaleString();

  return (
    <div
      className={cn(
        'fixed bottom-6 z-20 lg:hidden',
        isRTL ? 'left-5' : 'right-5'
      )}
    >
      {/* Ember glow — radiates behind the button */}
      <div className="absolute inset-0 -inset-x-1 -inset-y-1 rounded-neo-lg bg-neo-orange/40 animate-[ember-pulse_3s_ease-in-out_infinite] pointer-events-none" />

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', damping: 12, stiffness: 200 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95, y: 2 }}
        onClick={onOpenShop}
        aria-label={t('adventure.shop.open')}
        className={cn(
          'relative flex items-center gap-2.5',
          'pl-3.5 pr-2 py-2.5',
          'bg-gradient-to-b from-neo-orange to-[#cc4e1a]',
          'text-neo-black font-neo-display font-black text-sm uppercase tracking-wider',
          'border-3 border-neo-black rounded-neo-lg',
          'shadow-hard-lg',
          'transition-shadow duration-150',
          'hover:shadow-hard active:shadow-hard-pressed',
          // Top edge highlight for beveled "anvil plate" look
          'before:absolute before:inset-x-[3px] before:top-[3px] before:h-[3px]',
          'before:bg-white/25 before:rounded-t-neo before:pointer-events-none'
        )}
      >
        {/* Hammer icon with idle strike animation */}
        <motion.span
          animate={{ rotate: [0, -12, 0] }}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 4,
            ease: 'easeInOut',
          }}
          className="inline-flex origin-bottom-right"
        >
          <Hammer className="w-5 h-5 drop-shadow-[1px_1px_0px_rgba(0,0,0,0.3)]" />
        </motion.span>

        {/* Title */}
        <span className="drop-shadow-[1px_1px_0px_rgba(0,0,0,0.15)]">
          {t('adventure.shop.title')}
        </span>

        {/* Gold treasure badge */}
        <div
          className={cn(
            'flex items-center gap-1.5',
            'ms-0.5 px-2.5 py-1',
            'bg-neo-black/90 rounded-neo-lg',
            'border-2 border-neo-yellow/50'
          )}
        >
          <Coins className="w-4 h-4 text-neo-yellow drop-shadow-[0_0_4px_rgba(255,225,53,0.6)]" />
          <span className="text-neo-yellow font-neo-display font-bold text-sm tabular-nums tracking-tight">
            {formattedGold}
          </span>
        </div>

        {/* Spark dots — tiny decorative "sparks" */}
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-neo-yellow animate-[spark_2s_ease-in-out_infinite]" />
        <div className="absolute -top-0.5 right-3 w-1 h-1 rounded-full bg-neo-yellow/60 animate-[spark_2s_ease-in-out_infinite_0.7s]" />
      </motion.button>
    </div>
  );
}
