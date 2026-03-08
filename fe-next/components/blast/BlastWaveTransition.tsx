'use client';

import { useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

interface BlastWaveTransitionProps {
  /** Next wave number to display */
  waveNumber: number;
  /** Score earned in the wave that just ended */
  previousWaveScore: number;
  /** Words found in the wave that just ended */
  previousWaveWords: number;
  /** Clear percentage from the wave that just ended (0–100) */
  previousClearPercentage: number;
  /** Called when transition ends (auto after 3s or on tap) */
  onAdvance: () => void;
}

/** Computes 1–3 stars from clear percentage */
function getStars(clearPct: number): 1 | 2 | 3 {
  if (clearPct >= 80) return 3;
  if (clearPct >= 50) return 2;
  return 1;
}

/** Star row display */
function StarRating({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-1 justify-center text-3xl" aria-label={`${stars} stars`}>
      {[1, 2, 3].map(i => (
        <span key={i} className={i <= stars ? 'text-yellow-400' : 'text-white/20'}>
          ★
        </span>
      ))}
    </div>
  );
}

/**
 * BlastWaveTransition — 3-act cinematic overlay between waves.
 *
 * Act 1 (0–600ms):   "WAVE CLEAR!" springs in from below with scale punch
 * Act 2 (600–2000ms): Stats (score, words, clear%) slide in with stagger
 * Act 3 (2000ms+):    "Next Wave" card + tap-to-continue button appear
 *
 * Auto-advances after 3s or on tap.
 */
export function BlastWaveTransition({
  waveNumber,
  previousWaveScore,
  previousWaveWords,
  previousClearPercentage,
  onAdvance,
}: BlastWaveTransitionProps) {
  const { t } = useLanguage();
  const hasAdvancedRef = useRef(false);
  const stars = getStars(previousClearPercentage);

  const advance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onAdvance();
  }, [onAdvance]);

  // Auto-advance after 3s
  useEffect(() => {
    const timer = setTimeout(advance, 3000);
    return () => clearTimeout(timer);
  }, [advance]);

  const stats = [
    { label: t('common.score'), value: previousWaveScore, suffix: '' },
    { label: t('common.words'), value: previousWaveWords, suffix: '' },
    { label: t('blast.progress'), value: previousClearPercentage, suffix: '%' },
  ];

  return (
    <div
      data-testid="wave-transition-overlay"
      onClick={advance}
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-6',
        'bg-black/80 backdrop-blur-sm cursor-pointer'
      )}
    >
      {/* Act 1 — WAVE CLEAR! springs in */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 60, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="text-center"
      >
        <div
          className={cn(
            'bg-neo-light border-4 border-black shadow-hard rounded-neo p-6',
            'flex flex-col items-center gap-3'
          )}
        >
          <div className="font-black text-5xl uppercase tracking-tight font-neo-display text-black">
            {t('blast.waveClear')}
          </div>
          <StarRating stars={stars} />
        </div>
      </AdaptiveMotion.div>

      {/* Act 2 — Stats slide in with stagger */}
      <div className="flex gap-3">
        {stats.map((stat, index) => (
          <AdaptiveMotion.div
            key={stat.label}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + index * 0.15, type: 'spring', stiffness: 300, damping: 24 }}
            className={cn(
              'flex flex-col items-center px-5 py-3',
              'bg-gray-900 rounded-neo border border-gray-600 shadow-hard-sm',
              'min-w-[80px]'
            )}
          >
            <span className="font-black text-2xl text-white font-neo-display tabular-nums">
              {stat.value}{stat.suffix}
            </span>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-0.5">
              {stat.label}
            </span>
          </AdaptiveMotion.div>
        ))}
      </div>

      {/* Act 3 — Next wave card + continue button */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, type: 'spring', stiffness: 300, damping: 24 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="font-bold text-white/70 text-sm uppercase tracking-widest">
          {t('blast.title')} — {t('blast.wavesCompleted')} {waveNumber}
        </div>

        <button
          data-testid="wave-continue-btn"
          onClick={e => {
            e.stopPropagation();
            advance();
          }}
          className={cn(
            'bg-lime-400 border-3 border-black shadow-hard-sm text-black',
            'font-black text-xl uppercase py-4 px-8 rounded-neo',
            'active:shadow-hard-pressed active:translate-y-0.5',
            'transition-transform duration-75'
          )}
        >
          {t('blast.tapToContinue')}
        </button>
      </AdaptiveMotion.div>
    </div>
  );
}
