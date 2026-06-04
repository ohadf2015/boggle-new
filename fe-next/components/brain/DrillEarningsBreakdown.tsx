'use client';

/**
 * DrillEarningsBreakdown
 *
 * The results headline for every Brain Gym drill. Replaces the old
 * gray-trophy-on-loss / "Game Over" framing with an *always-colored* badge
 * (bronze is still a win), the forgiving display score, a warm badge title,
 * and a transparent breakdown of where the points came from — so a player
 * always sees that showing up was worth it.
 *
 * @module components/brain/DrillEarningsBreakdown
 */

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getDrillTheme } from '@/lib/drills/drillThemes';
import type { DrillType } from '@/shared/types/cognitive';
import type { DrillBadge } from '@/shared/utils/drillScoring';

interface DrillEarningsBreakdownProps {
  drillId: DrillType;
  badge: DrillBadge;
  /** Forgiving, player-facing score. */
  displayScore: number;
  /** "Showing up" floor portion. */
  participation: number;
  /** Earned portion. */
  performance: number;
  /** Optional extra (first-of-day, personal best, survival). Hidden when 0. */
  bonus?: number;
}

/** Each badge is colored — there is no gray/empty state. */
const BADGE_STYLE: Record<DrillBadge, { medal: string; ring: string; emoji: string }> = {
  bronze: { medal: 'bg-neo-orange', ring: 'border-neo-black', emoji: '🥉' },
  silver: { medal: 'bg-neo-white', ring: 'border-neo-black', emoji: '🥈' },
  gold: { medal: 'bg-neo-yellow', ring: 'border-neo-black', emoji: '🥇' },
  platinum: { medal: 'bg-neo-cyan', ring: 'border-neo-black', emoji: '💎' },
};

export default function DrillEarningsBreakdown({
  drillId,
  badge,
  displayScore,
  participation,
  performance,
  bonus = 0,
}: DrillEarningsBreakdownProps) {
  const { t } = useLanguage();
  const theme = getDrillTheme(drillId);
  const style = BADGE_STYLE[badge];

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-4"
    >
      {/* Always-colored badge medal */}
      <AdaptiveMotion.div
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 11, delay: 0.15 }}
        className={cn(
          'mx-auto w-20 h-20 rounded-full grid place-items-center text-4xl border-neo-thick shadow-hard-lg',
          style.medal,
          style.ring
        )}
        aria-hidden
      >
        {style.emoji}
      </AdaptiveMotion.div>

      {/* Warm, badge-based title — never "Game Over" */}
      <AdaptiveMotion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl font-black text-neo-white font-neo-display"
      >
        {t(`brain.drills.badge.${badge}.title`)}
      </AdaptiveMotion.h2>

      {/* Badge name chip in the drill accent */}
      <span
        className={cn(
          'inline-block px-3 py-1 rounded-neo border-neo border-neo-black text-xs font-black uppercase tracking-wide text-neo-black',
          `bg-${theme.accent}`
        )}
      >
        {t(`brain.drills.badge.${badge}.name`)}
      </span>

      {/* Big forgiving score */}
      <AdaptiveMotion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, type: 'spring' }}
        className="text-4xl font-black text-neo-white"
      >
        {displayScore}{' '}
        <span className="text-base font-bold text-neo-white/60">{t('brain.drills.points')}</span>
      </AdaptiveMotion.div>

      {/* Transparent breakdown */}
      <div className="p-3 rounded-neo border-neo border-neo-black bg-neo-navy-light text-left space-y-1.5 max-w-xs mx-auto">
        <Row label={t('brain.briefing.participationLabel')} value={participation} accent={theme.accent} />
        <Row label={t('brain.briefing.performanceLabel')} value={performance} accent={theme.accent} />
        {bonus > 0 && <Row label={t('brain.briefing.bonusLabel')} value={bonus} accent={theme.accent} />}
      </div>
    </AdaptiveMotion.div>
  );
}

function Row({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-neo-white/80">{label}</span>
      <span className={cn('text-sm font-black', `text-${accent}`)}>+{value}</span>
    </div>
  );
}
