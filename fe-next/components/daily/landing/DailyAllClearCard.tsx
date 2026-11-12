'use client';

import { useEffect } from 'react';
import { CheckCheck, Flame } from 'lucide-react';
import { fireVictoryConfetti } from '@/utils/confettiUtils';
import { triggerHaptic } from '@/utils/hapticFeedback';
import { useLanguage } from '@/contexts/LanguageContext';
import { TodayChestCard } from '../prize/TodayChestCard';

const ALL_DONE = { wordWheel: true, wordHunt: true, wordTower: true, connections: true };
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';

interface DailyAllClearCardProps {
  /** Current daily streak; the streak line is omitted at 0. */
  streak: number;
}

/**
 * Closure for a finished day. Takes the hero slot once every quest is played,
 * where the hub used to fall back to a desaturated Word Wheel card still
 * labelled START QUEST — an invitation into a game the player had finished.
 *
 * The card has no entrance tween (a full-width opacity tween is a known
 * mobile-Chromium flash source, rules/60 Class 5); the first show each day
 * fires a canvas confetti burst + haptic instead.
 */
function celebrateOncePerDay(): boolean {
  const key = `lc:daily-all-clear:${getDailyChallengeDate()}`;
  try {
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
  } catch {
    // storage blocked: celebrate anyway, a repeat beats a silent finish
  }
  return true;
}

export function DailyAllClearCard({ streak }: DailyAllClearCardProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!celebrateOncePerDay()) return;
    fireVictoryConfetti();
    triggerHaptic('success');
  }, []);

  return (
    <section
      data-testid="daily-all-clear"
      aria-live="polite"
      className="relative w-full overflow-hidden rounded-xl border-3 border-neo-black bg-neo-navy shadow-hard p-4 pe-6 flex flex-col gap-3"
    >
      <span aria-hidden="true" className="absolute inset-e-0 top-0 bottom-0 w-2 bg-neo-lime" />
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="shrink-0 w-12 h-12 rounded-full border-3 border-neo-black bg-neo-lime shadow-hard-sm flex items-center justify-center"
        >
          <CheckCheck className="w-7 h-7 text-neo-black" strokeWidth={3} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-neo-display font-black text-2xl leading-tight text-neo-lime">
            {t('daily.allClear.title')}
          </h2>
          <p className="mt-0.5 text-sm font-bold text-neo-white">{t('daily.allClear.body')}</p>
        </div>
        <span
          aria-hidden="true"
          role="presentation"
          data-testid="all-clear-art"
          style={{ backgroundImage: 'url(/daily/all-clear-coin.webp)' }}
          className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-md bg-cover bg-center border-2 border-neo-yellow"
        />
      </div>
      {streak > 0 && (
        <p className="flex items-center gap-1.5 text-xs font-black text-neo-yellow" data-testid="all-clear-streak">
          <Flame className="w-4 h-4 shrink-0 text-neo-orange" aria-hidden="true" />
          {t('daily.allClear.streak', { n: streak })}
        </p>
      )}
      {/* Today's one chest, the big one now that all four are done. Full card
          width, under the header row: squeezed between the check and the coin
          art it had ~90px on a phone. */}
      <div data-testid="all-clear-boxes">
        <TodayChestCard progress={ALL_DONE} />
      </div>
    </section>
  );
}

export default DailyAllClearCard;
