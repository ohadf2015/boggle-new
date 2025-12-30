'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';

interface CoinBalanceProps {
  coins?: number;
  size?: 'sm' | 'md' | 'lg';
  showAnimation?: boolean;
  className?: string;
}

export function CoinBalance({
  coins = 0,
  size = 'md',
  showAnimation = true,
  className
}: CoinBalanceProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm gap-1',
    md: 'px-3 py-2 text-base gap-2',
    lg: 'px-4 py-3 text-lg gap-2'
  };

  const iconSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const content = (
    <div
      role="status"
      aria-label={`Coin balance: ${coins.toLocaleString()}`}
      className={cn(
        'inline-flex items-center font-bold rounded-neo border-3 border-neo-black shadow-hard',
        'bg-gradient-to-r from-neo-yellow to-neo-orange/80',
        sizeClasses[size],
        className
      )}
    >
      <span className={iconSizes[size]} aria-hidden="true">💰</span>
      <span className="text-neo-black font-black">
        {coins.toLocaleString()}
      </span>
    </div>
  );

  if (showAnimation) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export default CoinBalance;
