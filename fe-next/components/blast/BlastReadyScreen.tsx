'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import {
  Star, Bomb, Sparkles, Snowflake, Shuffle,
  Zap, Magnet, Gem, Diamond, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { BlastDifficulty } from './types';

interface BlastReadyScreenProps {
  onStart: (difficulty: BlastDifficulty) => void;
}

const DIFFICULTIES = [
  {
    id: 'easy' as BlastDifficulty,
    color: 'text-cyan-300',
    border: 'border-cyan-400',
    selectedBg: 'bg-cyan-400/20',
    descKey: 'blast.ready.easyDesc',
    fallbackDesc: 'Fewer specials, relaxed cascades',
  },
  {
    id: 'medium' as BlastDifficulty,
    color: 'text-neo-yellow',
    border: 'border-neo-yellow',
    selectedBg: 'bg-neo-yellow/20',
    descKey: 'blast.ready.mediumDesc',
    fallbackDesc: 'Balanced chaos',
  },
  {
    id: 'hard' as BlastDifficulty,
    color: 'text-neo-pink',
    border: 'border-neo-pink',
    selectedBg: 'bg-neo-pink/20',
    descKey: 'blast.ready.hardDesc',
    fallbackDesc: 'Specials everywhere, brutal waves',
  },
];

const WAVE1_TILES = [
  { id: 'gold',     Icon: Star,      label: 'Gold',     desc: '3× score multiplier',    color: 'text-yellow-400' },
  { id: 'bomb',     Icon: Bomb,      label: 'Bomb',     desc: 'Clears 8 adjacent tiles', color: 'text-red-400' },
  { id: 'rainbow',  Icon: Sparkles,  label: 'Rainbow',  desc: '+5 bonus points',          color: 'text-purple-400' },
  { id: 'ice',      Icon: Snowflake, label: 'Ice',      desc: 'Takes 2 hits to break',    color: 'text-blue-300' },
  { id: 'wildcard', Icon: Shuffle,   label: 'Wildcard', desc: 'Any letter',               color: 'text-white' },
];

const WAVE2_TILES = [
  { id: 'lightning', Icon: Zap,      label: 'Lightning', desc: 'Clears entire column',     color: 'text-yellow-300' },
  { id: 'magnet',    Icon: Magnet,   label: 'Magnet',    desc: 'Attracts nearby specials',  color: 'text-purple-400' },
  { id: 'prism',     Icon: Gem,      label: 'Prism',     desc: 'Use twice for cross-clear', color: 'text-pink-300' },
  { id: 'gem',       Icon: Diamond,  label: 'Gem',       desc: 'Collect 3 for big bonus',   color: 'text-emerald-400' },
  { id: 'frozen',    Icon: Snowflake, label: 'Frozen',   desc: 'Takes 3 hits to break',     color: 'text-blue-200' },
];

export function BlastReadyScreen({ onStart }: BlastReadyScreenProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<BlastDifficulty>('medium');

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-4 py-6 overflow-y-auto">
      {/* Title */}
      <m.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="text-center mb-4 w-full"
      >
        <h1 className="text-4xl font-black uppercase text-white font-neo-display">
          {t('blast.ready.title')}
        </h1>
        <p className="text-sm font-bold text-white/50 mt-1">
          {t('blast.ready.subtitle')}
        </p>
      </m.div>

      {/* Difficulty picker */}
      <div className="w-full max-w-sm space-y-2 mb-4">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
          {t('blast.ready.difficulty')}
        </div>
        {DIFFICULTIES.map((diff, i) => (
          <m.button
            key={diff.id}
            data-testid={`difficulty-${diff.id}`}
            aria-pressed={selected === diff.id}
            onClick={() => setSelected(diff.id)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-neo border-3 text-start transition-all',
              'border-neo-black/50 shadow-hard-sm hover:shadow-hard active:shadow-none',
              selected === diff.id
                ? cn(diff.border, diff.selectedBg, 'shadow-hard')
                : 'bg-white/5 border-white/20 hover:bg-white/10',
            )}
          >
            <div className={cn('text-base font-black uppercase tracking-wider', diff.color)}>
              {t(`blast.ready.${diff.id}`)}
            </div>
            <div className="text-xs text-white/50 flex-1">
              {t(diff.descKey) || diff.fallbackDesc}
            </div>
            {selected === diff.id && (
              <m.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <ChevronRight className={cn('h-4 w-4', diff.color)} />
              </m.div>
            )}
          </m.button>
        ))}
      </div>

      {/* Tile guide */}
      <div className="w-full max-w-sm mb-4">
        <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">
          {t('blast.ready.tileGuide')}
        </div>

        <div className="space-y-1.5 mb-2">
          {WAVE1_TILES.map((tile) => (
            <div
              key={tile.id}
              data-testid={`tile-legend-${tile.id}`}
              className="flex items-center gap-3 px-3 py-1.5 rounded-neo bg-white/5 border border-white/10"
            >
              <tile.Icon className={cn('h-4 w-4 shrink-0', tile.color)} />
              <span className="font-bold text-xs text-white/80 w-16 shrink-0">{tile.label}</span>
              <span className="text-[10px] text-white/40 leading-tight">{tile.desc}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 opacity-50">
          <div className="text-[10px] font-black text-fuchsia-400/70 uppercase tracking-widest">
            {t('blast.ready.wave2Plus')}
          </div>
          {WAVE2_TILES.map((tile) => (
            <div
              key={tile.id}
              data-testid={`tile-legend-${tile.id}`}
              className="flex items-center gap-3 px-3 py-1.5 rounded-neo bg-white/5 border border-white/10"
            >
              <tile.Icon className={cn('h-4 w-4 shrink-0', tile.color)} />
              <span className="font-bold text-xs text-white/60 w-16 shrink-0">{tile.label}</span>
              <span className="text-[10px] text-white/30 leading-tight">{tile.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm"
      >
        <Button
          data-testid="play-button"
          size="lg"
          onClick={() => onStart(selected)}
          className="w-full min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-yellow text-neo-black hover:bg-neo-yellow/90"
        >
          {t('blast.ready.play')}
        </Button>
      </m.div>
    </div>
  );
}
