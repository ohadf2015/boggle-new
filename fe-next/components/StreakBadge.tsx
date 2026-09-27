'use client';

import { Flame, Snowflake } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccountStreak } from '@/hooks/useAccountStreak';
import { useRetentionStreak } from '@/hooks/useRetentionStreak';

/**
 * Header streak chip — constant awareness of the daily habit loop.
 * Flame + day count; a snowflake pip while this week's streak freeze is
 * still in inventory. Self-hides at 0 days (no streak to advertise yet) so
 * brand-new players don't see an empty counter.
 *
 * The day count follows the PLAYER'S ACCOUNT via `useAccountStreak` (the same
 * server number the daily-puzzle card shows), not the device — a signed-in
 * player sees the same streak here as everywhere else. Only the freeze pip
 * (a device-local inventory perk, unrelated to the account streak count)
 * still reads `useRetentionStreak` directly.
 */
export default function StreakBadge() {
  const { t } = useLanguage();
  const { streak, loading } = useAccountStreak();
  const { freezeAvailable } = useRetentionStreak();

  if (loading || streak <= 0) return null;

  const label = t('dailyStreak.badge', { count: streak });
  const freezeLabel = freezeAvailable ? t('dailyStreak.freezeReady') : '';

  return (
    <div
      data-testid="streak-badge"
      role="status"
      aria-label={freezeLabel ? `${label}. ${freezeLabel}` : label}
      title={freezeLabel || label}
      className="flex items-center gap-1 px-2 py-0.5 rounded-full border-2 border-neo-black bg-neo-orange/90 text-neo-black text-xs font-neo-display font-black shadow-hard-sm select-none"
    >
      <Flame className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden />
      <span>{streak}</span>
      {freezeAvailable && (
        <Snowflake
          className="w-3 h-3 text-neo-cyan"
          strokeWidth={2.5}
          aria-hidden
          data-testid="streak-freeze-pip"
        />
      )}
    </div>
  );
}
