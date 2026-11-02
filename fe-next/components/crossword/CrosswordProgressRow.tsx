'use client';

import { Timer } from 'lucide-react';
import type { CrosswordFormat } from '@/lib/crossword/format';

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, '0')}`;
}

export interface CrosswordProgressRowProps {
  wordsSolved: number;
  wordsTotal: number;
  percent: number;
  elapsedMs: number;
  format: CrosswordFormat;
  /** Omitted where the locale can't fill a full-size grid — then no size switch renders. */
  onFormatChange?: (format: CrosswordFormat) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Size switch + live fill bar + words + timer in ONE slim row, so the board keeps the height. */
export function CrosswordProgressRow({
  wordsSolved,
  wordsTotal,
  percent,
  elapsedMs,
  format,
  onFormatChange,
  t,
}: CrosswordProgressRowProps) {
  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-neo border-neo border-neo-cream/40 bg-neo-navy-light px-2.5 py-1.5">
      {onFormatChange && (
        <div
          role="group"
          aria-label={t('crossword.formatLabel')}
          className="flex shrink-0 overflow-hidden rounded-full border-neo border-neo-cream/40"
        >
          {(['mini', 'full'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormatChange(f)}
              aria-pressed={format === f}
              className={`px-2.5 py-0.5 font-neo-display text-xs font-bold ${
                format === f ? 'bg-neo-cyan text-neo-navy' : 'text-neo-white/80'
              }`}
            >
              {t(`crossword.format.${f}`)}
            </button>
          ))}
        </div>
      )}
      <div
        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-neo-navy"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t('crossword.progressLabel')}
      >
        <div
          className="h-full bg-neo-cyan transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className="shrink-0 font-neo-display text-sm font-bold tabular-nums text-neo-cyan"
        aria-label={t('crossword.wordsLabel')}
      >
        {wordsSolved}
        <span className="text-neo-white/55">/{wordsTotal}</span>
      </span>
      <div
        className="flex shrink-0 items-center gap-1 font-neo-display text-sm font-bold tabular-nums text-neo-white"
        aria-label={t('crossword.timer')}
      >
        <Timer size={14} className="text-neo-cyan" aria-hidden />
        {formatTime(elapsedMs)}
      </div>
    </div>
  );
}

export { formatTime };
