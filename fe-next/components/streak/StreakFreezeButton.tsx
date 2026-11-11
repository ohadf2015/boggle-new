'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAX_HELD_FREEZES } from '@/lib/daily/streakRewards';
import { StreakFreezeSheet } from './StreakFreezeSheet';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

interface StreakFreezeButtonProps {
  freezes: number;
  isGuest: boolean;
  /** Called after a purchase so the owner can refetch the streak. */
  onChanged?: () => void;
  testId?: string;
  className?: string;
}

/** The freeze count as a button that opens the freeze shop (sign-in first for a guest). */
export function StreakFreezeButton({ freezes, isGuest, onChanged, testId = 'streak-freeze-button', className }: StreakFreezeButtonProps) {
  const { t } = useLanguage();
  // The coin counter reads profile.total_coins.
  const { refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOpen(true)}
        aria-label={t('dailyStreak.flame.freezesLabel', { n: freezes, max: MAX_HELD_FREEZES })}
        className={cn(
          'flex items-center gap-1 rounded-full border-2 border-neo-black bg-neo-cyan px-2 py-0.5 font-neo-display text-[11px] font-bold text-neo-black shadow-hard-sm active:translate-y-0.5 active:shadow-none lg:text-sm',
          className,
        )}
      >
        <Snowflake className="h-3 w-3 lg:h-4 lg:w-4" strokeWidth={3} aria-hidden="true" />
        <span className="tabular-nums">{freezes}/{MAX_HELD_FREEZES}</span>
      </button>
      <StreakFreezeSheet
        open={open}
        freezes={freezes}
        isGuest={isGuest}
        onSignIn={() => {
          setOpen(false);
          setAuthOpen(true);
        }}
        onClose={() => setOpen(false)}
        onBought={() => {
          onChanged?.();
          void refreshProfile?.();
        }}
      />
      {authOpen && <AuthModal isOpen onClose={() => setAuthOpen(false)} initialMode="signup" />}
    </>
  );
}

export default StreakFreezeButton;
