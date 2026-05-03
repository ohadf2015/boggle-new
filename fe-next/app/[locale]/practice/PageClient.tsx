'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { Mascot, type MascotVariant } from '@/components/ui/Mascot';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { usePracticeProgress } from '@/components/practice/usePracticeProgress';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface ModeStyle {
  mascot: MascotVariant;
  border: string;
  badge: string;
  cta: string;
  bg: string;
}

const MODE_STYLE: Record<PracticeMode, ModeStyle> = {
  classic: {
    mascot: 'scholar',
    border: 'border-neo-cyan',
    badge: 'cyan',
    cta: 'bg-neo-cyan',
    bg: 'from-neo-cyan/10 to-transparent',
  },
  wordHunt: {
    mascot: 'explorer',
    border: 'border-neo-lime',
    badge: 'lime',
    cta: 'bg-neo-lime',
    bg: 'from-neo-lime/10 to-transparent',
  },
  wheelRush: {
    mascot: 'dj',
    border: 'border-neo-purple',
    badge: 'purple',
    cta: 'bg-neo-purple text-neo-white',
    bg: 'from-neo-purple/10 to-transparent',
  },
};

interface Props {
  locale: string;
}

/**
 * Practice hub. Hero greeting + progress bar + mascot-fronted mode cards.
 * A skip CTA at the bottom lets returning players jump straight home.
 */
export default function PracticeHubClient({ locale }: Props) {
  const { t, language } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();
  const completed = usePracticeProgress(language);
  const total = PRACTICE_MODES.length;
  const done = completed.size;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const allDone = done === total;
  const handleTileTap = () => {
    playButtonClickSound();
    haptics.tap();
  };

  return (
    <div className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light px-5 py-6">
      <div className="max-w-md mx-auto">
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="mb-4 flex items-center gap-3"
        >
          <Mascot variant="waving" size="sm" clipShape="circle" clipBorder="lime" />
          <div className="flex-1 bg-neo-cream text-neo-black border-3 border-neo-black rounded-neo px-3 py-2 shadow-hard-sm">
            <h1 className="text-lg font-neo-display font-black uppercase tracking-tight leading-none">
              {t('practiceHub.title')}
            </h1>
            <p className="text-xs font-neo-body font-bold leading-tight mt-0.5">
              {t('practiceHub.greet')}
            </p>
          </div>
        </AdaptiveMotion.div>

        <AdaptiveMotion.div
          data-testid="practice-progress-card"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
          className="mb-5 px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider font-neo-display font-black text-neo-cream/70">
              {t('practiceHub.progressLabel')}
            </span>
            <span
              data-testid="practice-progress-count"
              className="text-sm font-neo-display font-black text-neo-lime"
            >
              {t('practiceHub.stepCount', { done, total })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            aria-label={t('practiceHub.progress', { done, total })}
            className="relative h-3 w-full rounded-full bg-neo-navy border-2 border-neo-black overflow-hidden"
          >
            <AdaptiveMotion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className={
                'h-full ' + (allDone ? 'bg-neo-lime' : 'bg-linear-to-r from-neo-cyan via-neo-lime to-neo-pink')
              }
            />
          </div>
          <div
            data-testid="practice-progress-headline"
            className="mt-2 text-[11px] font-neo-body font-bold text-neo-cream/70 text-center"
          >
            {t('practiceHub.progress', { done, total })}
          </div>
        </AdaptiveMotion.div>

        {allDone && (
          <AdaptiveMotion.div
            data-testid="practice-all-complete"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="mb-5 px-4 py-3 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black shadow-hard text-center"
          >
            <p className="font-neo-display font-black text-base mb-0.5">
              {t('practiceHub.allCompleteTitle')}
            </p>
            <p className="font-neo-body text-xs">
              {t('practiceHub.allCompleteBody')}
            </p>
          </AdaptiveMotion.div>
        )}

        <div className="flex flex-col gap-3">
          {PRACTICE_MODES.map((mode, idx) => {
            const isDone = completed.has(mode);
            const style = MODE_STYLE[mode];
            return (
              <AdaptiveMotion.div
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 + idx * 0.06 }}
              >
                <Link
                  href={`/${locale}/practice/${mode}`}
                  onClick={handleTileTap}
                  data-testid={`practice-tile-${mode}`}
                  data-complete={isDone}
                  aria-label={
                    isDone
                      ? `${t(`gameModes.${mode}.name`)} — ${t('practiceHub.completedBadge')}`
                      : t(`gameModes.${mode}.name`)
                  }
                  className={`relative block rounded-neo border-3 ${style.border} bg-linear-to-r ${style.bg} bg-neo-navy-light px-3 py-3 transition-transform active:translate-y-px shadow-hard-sm overflow-hidden`}
                >
                  {isDone && (
                    <span
                      aria-hidden
                      className="absolute top-2 end-3 inline-flex items-center justify-center w-7 h-7 rounded-full bg-neo-lime text-neo-black border-2 border-neo-black font-neo-display font-black text-sm shadow-hard-sm"
                    >
                      ✓
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <Mascot
                      variant={style.mascot}
                      size="xs"
                      clipShape="circle"
                      clipBorder={style.badge as 'cyan' | 'lime' | 'purple'}
                    />
                    <div className="flex-1 min-w-0 pe-8">
                      <h2 className="text-lg font-neo-display font-black text-neo-cream leading-tight">
                        {t(`gameModes.${mode}.name`)}
                      </h2>
                      <p className="text-xs font-neo-body font-bold text-neo-cream/80 leading-tight mt-0.5">
                        {t(`gameModes.${mode}.description`)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1.5 rounded-neo border-2 border-neo-black text-neo-black font-neo-display font-black text-xs uppercase tracking-wide shadow-hard-sm ${style.cta}`}
                    >
                      {isDone ? t('practiceHub.playAgainLabel') : t('practiceHub.playLabel')}
                    </span>
                  </div>
                </Link>
              </AdaptiveMotion.div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href={`/${locale}`}
            data-testid="practice-skip-cta"
            onClick={handleTileTap}
            className="text-xs font-neo-display font-black text-neo-cream/60 hover:text-neo-cream underline underline-offset-4 decoration-2"
          >
            {t('practiceHub.skipLabel')}
          </Link>
        </div>
      </div>
    </div>
  );
}
