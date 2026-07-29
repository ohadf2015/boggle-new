'use client';

import { BOT_DIFFICULTIES, type BotDifficulty } from '@/lib/word-craft/botDifficulty';

interface Props {
  value: BotDifficulty;
  onChange: (next: BotDifficulty) => void;
  t: (path: string, fallback?: string) => string;
}

// Per-difficulty accent so the active segment reads at a glance on a TV/party
// screen. Stays within the neo palette (cyan/yellow/pink families).
const TONE: Record<BotDifficulty, string> = {
  easy: 'bg-neo-cyan',
  medium: 'bg-neo-yellow',
  hard: 'bg-neo-pink text-white',
};

/**
 * Three-segment bot-difficulty toggle for the WordCraft topbar. Stateless —
 * the page owns the value + localStorage persistence.
 */
export function WordCraftDifficultySelect({ value, onChange, t }: Props) {
  return (
    <div
      role="group"
      aria-label={t('wordcraft.difficulty.label')}
      className="inline-flex items-center gap-0.5 rounded-neo border-2 border-black bg-neo-navy-light p-0.5 shadow-hard-sm"
    >
      {BOT_DIFFICULTIES.map((d) => {
        const active = d === value;
        return (
          <button
            key={d}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(d);
            }}
            className={[
              'px-2 py-1 rounded-[6px] text-xs font-neo-display font-black uppercase tracking-wide transition-colors',
              active
                ? `${TONE[d]} text-neo-navy border-2 border-black shadow-hard-sm`
                : 'text-neo-white/70 hover:text-neo-white',
            ].join(' ')}
          >
            {t(`wordcraft.difficulty.${d}`)}
          </button>
        );
      })}
    </div>
  );
}
