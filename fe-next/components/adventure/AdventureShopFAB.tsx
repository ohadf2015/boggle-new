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
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: 'spring', damping: 15 }}
      onClick={onOpenShop}
      className={cn(
        'fixed bottom-6 z-20 lg:hidden',
        isRTL ? 'left-6' : 'right-6',
        'flex items-center gap-2 px-5 py-3',
        'bg-neo-orange text-neo-black font-black text-sm uppercase tracking-wide',
        'border-3 border-neo-black rounded-neo shadow-hard-lg',
        'hover:shadow-hard hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-hard-pressed',
        'transition-all duration-150'
      )}
      aria-label={t('adventure.shop.open')}
    >
      <Hammer className="w-5 h-5" />
      <span>{t('adventure.shop.title')}</span>
      <div className="flex items-center gap-1 ms-1 px-2 py-0.5 bg-neo-black/20 rounded-neo">
        <Coins className="w-3.5 h-3.5 text-neo-yellow" />
        <span className="text-neo-yellow font-bold">{gold}</span>
      </div>
    </motion.button>
  );
}
