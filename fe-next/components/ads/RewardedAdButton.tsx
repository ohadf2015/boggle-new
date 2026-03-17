'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useAdPlacement } from '@/hooks/useAdPlacement';

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
  const { showRewarded, isReady } = useAdPlacement();

  const handleClick = () => {
    showRewarded(name, { onReward, onDismiss });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || (!isReady && process.env.NODE_ENV !== 'development')}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 font-bold',
        'border-3 border-black rounded-neo',
        'transition-all active:translate-y-0.5',
        isDark
          ? 'bg-neo-cyan text-black shadow-hard hover:bg-neo-cyan/90'
          : 'bg-neo-yellow text-black shadow-hard hover:bg-neo-yellow/90',
        'active:shadow-hard-pressed',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0',
        className,
      )}
    >
      <Play className="h-4 w-4 fill-current" />
      {children}
    </button>
  );
};

export default RewardedAdButton;
