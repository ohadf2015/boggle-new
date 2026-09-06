'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { Bot, RotateCcw, BookOpen, Trophy, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import type { DifficultyLevel } from '@/shared/types/game';
import type { SinglePlayerMode } from '../../SinglePlayerView';
import { buildNextGameOptions, type NextGameOption } from '../nextGame';

interface NextGamePickerProps {
  mode: SinglePlayerMode;
  difficulty: DifficultyLevel;
  isWinner: boolean;
  /** Start a bots preset in-page (no navigation). */
  onStartPreset: (presetId: string) => void;
  /** Replay the current setup in-page. */
  onReplaySame: () => void;
  className?: string;
}

const ACCENT: Record<NextGameOption['accent'], string> = {
  lime: 'bg-neo-lime text-neo-black',
  cyan: 'bg-neo-cyan text-neo-black',
  pink: 'bg-neo-pink text-neo-white',
  amber: 'bg-neo-yellow text-neo-black',
};

const ICON: Record<string, React.ElementType> = {
  'rematch-harder': Swords,
  'rematch-same': RotateCcw,
  bots: Bot,
  practice: BookOpen,
  daily: Trophy,
};

const TILE =
  'group flex items-center gap-3 p-3 rounded-neo border-3 border-neo-black shadow-hard text-start ' +
  'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 ' +
  'active:shadow-hard-pressed transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white';

/**
 * NextGamePicker — the mode choice single player lost when its lobby was
 * removed. A compact grid on the results screen: rematch (harder / same),
 * practice, daily. Rematch options start in-page so returning players never
 * hit the bare-/singleplayer re-entry gate.
 */
export const NextGamePicker: React.FC<NextGamePickerProps> = memo(({
  mode, difficulty, isWinner, onStartPreset, onReplaySame, className,
}) => {
  const { t, language } = useLanguage();
  const options = useMemo(
    () => buildNextGameOptions({ mode, difficulty, isWinner, language }),
    [mode, difficulty, isWinner, language],
  );

  const pick = (opt: NextGameOption) => {
    trackGrowthEvent('next_game_picked', {
      option: opt.id,
      from: mode,
      ...(opt.kind === 'action' ? { preset: opt.presetId || 'same' } : { href: opt.href }),
    });
    if (opt.kind === 'action') {
      if (opt.presetId) onStartPreset(opt.presetId);
      else onReplaySame();
    }
  };

  return (
    <section aria-label={t('singlePlayer.nextGame.title')} className={cn('space-y-2', className)}>
      <h3 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">
        {t('singlePlayer.nextGame.title')}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const Icon = ICON[opt.id] ?? Bot;
          const body = (
            <>
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black', ACCENT[opt.accent])}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-neo-display font-black text-sm uppercase text-neo-white leading-tight truncate">
                  {t(opt.labelKey)}
                </span>
                <span className="block text-[11px] text-neo-white/70 leading-tight">{t(opt.descKey)}</span>
              </span>
            </>
          );
          const tileClass = cn(TILE, 'bg-neo-navy-light');
          if (opt.kind === 'link') {
            return (
              <Link
                key={opt.id}
                href={opt.href}
                prefetch={false}
                data-testid={`next-game-${opt.id}`}
                className={tileClass}
                onClick={() => pick(opt)}
              >
                {body}
              </Link>
            );
          }
          return (
            <button
              key={opt.id}
              type="button"
              data-testid={`next-game-${opt.id}`}
              className={tileClass}
              onClick={() => pick(opt)}
            >
              {body}
            </button>
          );
        })}
      </div>
    </section>
  );
});

NextGamePicker.displayName = 'NextGamePicker';

export default NextGamePicker;
