'use client';

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { RotateCcw, ArrowRight, CalendarDays } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { DrillType } from '@/shared/types/cognitive';
import { computeNextDrill } from '@/lib/drills/nextDrill';

interface DrillCompleteActionsProps {
  /** The drill that just finished — used to suggest the next one. */
  currentDrillId: DrillType;
  /** Restart the same drill. */
  onPlayAgain: () => void;
  /** Leave to the brain hub (optional, mirrors prior CompletePhase behaviour). */
  onExit?: () => void;
}

/**
 * Shared post-round footer for every brain drill.
 *
 * Replaces the old Play-Again / Exit-only footer: after a round the player is
 * always offered somewhere to keep going — the next unlocked drill ("Next: …")
 * and the Daily Challenge — so finishing one drill leads into the next game
 * instead of dead-ending.
 */
export default function DrillCompleteActions({
  currentDrillId,
  onPlayAgain,
  onExit,
}: DrillCompleteActionsProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { profile } = useAuth();

  const gamesPlayed = profile?.total_games ?? 0;
  const nextDrill = computeNextDrill(currentDrillId, gamesPlayed);
  const nextDrillName = nextDrill ? t(`brain.drills.${nextDrill}.name`) : '';

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 }}
      className="w-full space-y-3"
    >
      {/* Primary row — keep the momentum going */}
      <div className="flex flex-wrap gap-3 justify-center">
        {nextDrill && (
          <AdaptiveMotion.button
            data-testid="drill-next"
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/${language}/brain/drills/${nextDrill}`)}
            className="flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase bg-neo-purple text-neo-white"
          >
            {t('brain.drills.nextDrillCta', { drill: nextDrillName })}
            <ArrowRight className="w-5 h-5 rtl:rotate-180" />
          </AdaptiveMotion.button>
        )}
        <AdaptiveMotion.button
          data-testid="drill-play-again"
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
          className="flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black shadow-hard font-bold uppercase bg-slate-700 text-neo-white"
        >
          <RotateCcw className="w-5 h-5" />
          {t('brain.drills.playAgain')}
        </AdaptiveMotion.button>
      </div>

      {/* Secondary row — other places to go */}
      <div className="flex flex-wrap gap-3 justify-center">
        <AdaptiveMotion.button
          data-testid="drill-daily"
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push(`/${language}/daily`)}
          className="flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-sm uppercase bg-neo-navy-light text-neo-white"
        >
          <CalendarDays className="w-4 h-4" />
          {t('brain.drills.dailyChallengeCta')}
        </AdaptiveMotion.button>
        {onExit && (
          <AdaptiveMotion.button
            data-testid="drill-exit"
            whileTap={{ scale: 0.95 }}
            onClick={onExit}
            className={cn(
              'px-4 py-2 rounded-neo border-2 border-neo-black font-bold text-sm uppercase',
              'bg-slate-800 text-neo-white/80',
            )}
          >
            {t('brain.drills.exit')}
          </AdaptiveMotion.button>
        )}
      </div>
    </AdaptiveMotion.div>
  );
}
