'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Target, Gem, Zap, Snowflake, Bomb, Type, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { formatObjectiveLabel } from './utils/blastObjectiveUtils';
import type { BlastObjective, BlastObjectiveType, BlastTileType } from './types';

interface BlastWaveIntroProps {
  waveNumber: number;
  objectives: BlastObjective[];
  movesAllowed: number;
  onReady: () => void;
  t: (key: string) => string | undefined;
}

/** Icon for each objective type */
function ObjectiveIcon({ type, tileType }: { type: BlastObjectiveType; tileType?: BlastTileType }) {
  if (type === 'word_length') return <Type className="w-5 h-5" />;
  if (type === 'score_target') return <Star className="w-5 h-5" />;

  switch (tileType) {
    case 'gem': return <Gem className="w-5 h-5" />;
    case 'lightning': return <Zap className="w-5 h-5" />;
    case 'ice': case 'frozen': return <Snowflake className="w-5 h-5" />;
    case 'bomb': return <Bomb className="w-5 h-5" />;
    default: return <Target className="w-5 h-5" />;
  }
}

/**
 * BlastWaveIntro — shows wave number, objectives, and move count
 * before a wave begins. Auto-advances after 4s or on GO tap.
 */
export function BlastWaveIntro({
  waveNumber,
  objectives,
  movesAllowed,
  onReady,
  t,
}: BlastWaveIntroProps) {
  const hasAdvancedRef = useRef(false);

  const advance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onReady();
  }, [onReady]);

  // Auto-advance after 4s
  useEffect(() => {
    const timer = setTimeout(advance, 4000);
    return () => clearTimeout(timer);
  }, [advance]);

  const waveTitle = (t('blast.waveIntro.title') || '')
    .replace('{wave}', String(waveNumber));

  const movesLabel = (t('blast.waveIntro.moves') || '')
    .replace('{moves}', String(movesAllowed));

  return (
    <div
      data-testid="wave-intro-overlay"
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-6',
        'bg-black/85 backdrop-blur-sm'
      )}
    >
      {/* Wave number */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="text-center"
      >
        <div className="font-black text-5xl uppercase tracking-tight font-neo-display text-white">
          {waveTitle}
        </div>
      </AdaptiveMotion.div>

      {/* Objectives */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 24 }}
        className="flex flex-col gap-2 max-w-xs w-full"
      >
        <div className="text-xs font-bold text-white/70 uppercase tracking-widest text-center mb-1">
          {t('blast.waveIntro.objectives')}
        </div>
        {objectives.map((obj, idx) => (
          <div
            key={idx}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-neo',
              'bg-white/10 border border-white/20',
              'text-white text-sm font-semibold'
            )}
          >
            <ObjectiveIcon type={obj.type} tileType={obj.tileType} />
            <span>{formatObjectiveLabel(obj, t)}</span>
          </div>
        ))}
      </AdaptiveMotion.div>

      {/* Move count */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 24 }}
        className="text-center"
      >
        <div className={cn(
          'inline-block px-5 py-2 rounded-neo',
          'bg-gradient-to-br from-emerald-400 to-emerald-600',
          'border-3 border-neo-black shadow-hard-sm',
          'font-black text-lg text-neo-black uppercase tracking-wide'
        )}>
          {movesLabel}
        </div>
      </AdaptiveMotion.div>

      {/* GO button */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, type: 'spring', stiffness: 300, damping: 15 }}
      >
        <button
          data-testid="wave-intro-go-btn"
          onClick={advance}
          className={cn(
            'bg-neo-lime border-3 border-black shadow-hard text-black',
            'font-black text-3xl uppercase py-4 px-12 rounded-neo',
            'active:shadow-hard-pressed active:translate-y-0.5',
            'transition-transform duration-75'
          )}
        >
          {t('blast.waveIntro.go')}
        </button>
      </AdaptiveMotion.div>
    </div>
  );
}
