'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useAdPlacement } from '@/hooks/useAdPlacement';
import { useAdMob } from '@/hooks/useAdMob';

interface RewardedAdButtonProps {
  name: string;
  onReward: () => void;
  onDismiss?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const RewardedAdButton: React.FC<RewardedAdButtonProps> = ({
  name,
  onReward,
  onDismiss,
  children,
  className,
  disabled = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { showRewarded: showWebRewarded, isReady: isWebReady } = useAdPlacement();
  const adMob = useAdMob();
  const [pending, setPending] = useState(false);

  const isNative = Capacitor.isNativePlatform();
  const isReady = isNative || isWebReady;

  const handleClick = () => {
    if (pending) return;
    setPending(true);
    const done = () => setPending(false);
    if (isNative) {
      adMob.showRewarded(
        () => { onReward(); done(); },
        () => { onDismiss?.(); done(); },
      );
    } else {
      showWebRewarded(name, {
        onReward: () => { onReward(); done(); },
        onDismiss: () => { onDismiss?.(); done(); },
      });
      if (process.env.NODE_ENV === 'development') done();
    }
  };

  const hardDisabled = disabled || (!isReady && process.env.NODE_ENV !== 'development');
  const isDisabled = hardDisabled || pending;
  const isIdle = !isDisabled;

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      whileHover={isIdle ? { scale: 1.03, y: -2 } : undefined}
      whileTap={isIdle ? { scale: 0.97 } : undefined}
      animate={isIdle ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={isIdle ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.15 }}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 px-4 py-2.5 font-black uppercase tracking-wide',
        'border-3 border-black rounded-neo shadow-hard',
        'transition-colors active:shadow-hard-pressed active:translate-y-0.5',
        isDark
          ? 'bg-neo-cyan text-black hover:bg-neo-cyan/90'
          : 'bg-neo-yellow text-black hover:bg-neo-yellow/90',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0',
        className,
      )}
    >
      {isIdle && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-neo pointer-events-none animate-pulse opacity-30 ring-2 ring-black"
        />
      )}
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Play className="h-4 w-4 fill-current" />
      )}
      <span className="relative">{children}</span>
    </motion.button>
  );
};

export default RewardedAdButton;
