'use client';

/**
 * DrillBriefing
 *
 * The lean, action-first "ready" screen shared by every Brain Gym drill.
 * A casual player gets it in seconds: mascot + persona, the one-line mission,
 * this round's goal, and a big CTA that sits ABOVE the fold (no scrolling past
 * a wall of text to start). Secondary exposition — the "why it helps" benefit,
 * the 3-step how-to and the coach tip — was removed (2026-06-13): the mission
 * line already says what to do, and the drills are self-explanatory once you
 * tap Start. Those i18n keys remain defined for a later clean-translations
 * sweep; nothing here renders them.
 *
 * All copy is i18n-keyed (via drillThemes + brain.briefing.*). Visuals stay
 * neo-brutalist and reuse the existing mascot cast for coherence.
 *
 * @module components/brain/DrillBriefing
 */

import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Mascot } from '@/components/ui/Mascot';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { getDrillTheme, ACCENT_CLASSES } from '@/lib/drills/drillThemes';
import type { DrillType } from '@/shared/types/cognitive';

interface DrillBriefingProps {
  drillId: DrillType;
  /** Current drill level (1..5), shown as a small chip. */
  level: number;
  /** Pre-formatted, already-translated goal line for this round/level. */
  goalText: string;
  /** Start the drill. */
  onStart: () => void;
}

export default function DrillBriefing({ drillId, level, goalText, onStart }: DrillBriefingProps) {
  const { t } = useLanguage();
  const theme = getDrillTheme(drillId);
  const accentCls = ACCENT_CLASSES[theme.accent];

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-4 max-w-sm mx-auto"
    >
      {/* Persona header: mascot + name in the drill's accent */}
      <div className="space-y-1.5">
        <AdaptiveMotion.div
          initial={{ scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 11, delay: 0.1 }}
          className="mx-auto w-fit"
        >
          <Mascot variant={theme.mascot} size="lg" animated />
        </AdaptiveMotion.div>
        <p className={cn('text-xs font-black uppercase tracking-wide', accentCls.text)}>
          {t(theme.personaKey)}
        </p>
        <h2 className="text-2xl font-black text-neo-white font-neo-display">
          {t(`brain.drills.${drillId}.name`)}
        </h2>
      </div>

      {/* Mission banner — the single most important "what do I do" line */}
      <div className={cn('p-3 rounded-neo border-neo-thick border-neo-black', accentCls.bg)}>
        <p className="text-sm font-bold text-neo-black">{t(theme.missionKey)}</p>
      </div>

      {/* Goal for this round */}
      <div className="p-2.5 rounded-neo border-neo border-neo-black bg-neo-navy-light flex items-center justify-center gap-2 text-center">
        <span className="text-base" aria-hidden>🎯</span>
        <p className="text-sm font-bold text-neo-white">
          <span className="text-neo-white/60">{t('brain.drills.level')} {level} · </span>
          {goalText}
        </p>
      </div>

      {/* Themed CTA — lifted directly under the goal so Start is always in reach */}
      <AdaptiveMotion.button
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className={cn(
          'w-full px-8 py-3.5 rounded-neo border-neo-thick border-neo-black shadow-hard-lg',
          'font-black text-lg uppercase text-neo-black',
          'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg active:translate-y-0',
          accentCls.bg
        )}
      >
        {t('brain.briefing.letsTrain')}
      </AdaptiveMotion.button>
    </AdaptiveMotion.div>
  );
}
