'use client';

/**
 * DrillBriefing
 *
 * The warm, instantly-legible "ready" screen shared by every Brain Gym drill.
 * Replaces the old icon + one-line description with a themed coach card so a
 * casual player gets it in seconds: persona + mascot, mission, why it helps,
 * a 3-step how-to, a goal for this round, a coach tip, and a big themed CTA.
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
import { getDrillTheme } from '@/lib/drills/drillThemes';
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
  const accent = theme.accent;

  const steps = [
    t(`brain.drills.${drillId}.step1`),
    t(`brain.drills.${drillId}.step2`),
    t(`brain.drills.${drillId}.step3`),
  ];

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-5 max-w-sm mx-auto"
    >
      {/* Persona header: mascot + name in the drill's accent */}
      <div className="space-y-2">
        <AdaptiveMotion.div
          initial={{ scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 11, delay: 0.1 }}
          className="mx-auto w-fit"
        >
          <Mascot variant={theme.mascot} size="lg" animated />
        </AdaptiveMotion.div>
        <p className={cn('text-xs font-black uppercase tracking-wide', `text-${accent}`)}>
          {t(theme.personaKey)}
        </p>
        <h2 className="text-2xl font-black text-neo-white font-neo-display">
          {t(`brain.drills.${drillId}.name`)}
        </h2>
      </div>

      {/* Mission banner — the single most important "what do I do" line */}
      <div className={cn('p-3 rounded-neo border-neo-thick border-neo-black', `bg-${accent}`)}>
        <p className="text-[10px] font-black uppercase tracking-wide text-neo-black/70">
          {t('brain.briefing.missionLabel')}
        </p>
        <p className="text-sm font-bold text-neo-black">{t(theme.missionKey)}</p>
      </div>

      {/* Goal for this round + benefit */}
      <div className="grid grid-cols-1 gap-2 text-left">
        <div className="p-2.5 rounded-neo border-neo border-neo-black bg-neo-navy-light flex items-start gap-2">
          <span className="text-base" aria-hidden>🎯</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-neo-white/60">
              {t('brain.briefing.goalLabel')} · {t('brain.drills.level')} {level}
            </p>
            <p className="text-sm font-bold text-neo-white">{goalText}</p>
          </div>
        </div>
        <div className="p-2.5 rounded-neo border-neo border-neo-black bg-neo-navy-light flex items-start gap-2">
          <span className="text-base" aria-hidden>🧠</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-neo-white/60">
              {t('brain.briefing.benefitLabel')}
            </p>
            <p className="text-sm text-neo-white">{t(theme.benefitKey)}</p>
          </div>
        </div>
      </div>

      {/* 3-step how-to */}
      <div className="text-left space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-neo-white/60 px-0.5">
          {t('brain.briefing.howToLabel')}
        </p>
        <ol className="space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex-shrink-0 w-6 h-6 rounded-neo border-neo border-neo-black grid place-items-center text-xs font-black text-neo-black',
                  `bg-${accent}`
                )}
              >
                {i + 1}
              </span>
              <span className="text-sm text-neo-white">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Coach tip */}
      <div className="p-2.5 rounded-neo border-neo border-dashed border-neo-white/30 bg-neo-navy text-left flex items-start gap-2">
        <span className="text-base" aria-hidden>💡</span>
        <p className="text-xs text-neo-white/80">
          <span className="font-black">{t('brain.briefing.coachLabel')}: </span>
          {t(theme.coachTipKey)}
        </p>
      </div>

      {/* Themed CTA */}
      <AdaptiveMotion.button
        whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className={cn(
          'w-full px-8 py-3.5 rounded-neo border-neo-thick border-neo-black shadow-hard-lg',
          'font-black text-lg uppercase text-neo-black',
          'transition-all hover:translate-y-[-2px] hover:shadow-hard-lg active:translate-y-0',
          `bg-${accent}`
        )}
      >
        {t('brain.briefing.letsTrain')}
      </AdaptiveMotion.button>
    </AdaptiveMotion.div>
  );
}
