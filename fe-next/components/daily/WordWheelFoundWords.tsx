import React, { useState } from 'react';
import { m } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';

type T = (key: string, params?: Record<string, string | number>) => string;

interface WordWheelFoundWordsProps {
  t: T;
  words: string[];
  lastFound: string | null;
  variant?: 'strip' | 'panel';
  reducedMotion?: boolean;
  /** An "already found" resubmit: that word pulses where it sits. */
  pulse?: { word: string; id: number } | null;
}

type Pulse = WordWheelFoundWordsProps['pulse'];

function pulseKey(w: string, pulse: Pulse) {
  return pulse && pulse.word === w ? `${w}-pulse-${pulse.id}` : w;
}

function AllWords({ words, lastFound, columns, reducedMotion = false, large = false, pulse = null }: { words: string[]; lastFound: string | null; columns: string; reducedMotion?: boolean; large?: boolean; pulse?: Pulse }) {
  const sorted = [...words].sort((a, b) => a.localeCompare(b));
  return (
    <ul data-testid="found-words-all" className={cn('grid gap-x-5 gap-y-1', columns)}>
      {sorted.map(w => (
        <m.li
          key={pulseKey(w, pulse)}
          data-testid="found-word"
          data-pulse={pulse?.word === w ? 'true' : undefined}
          className={cn(
            'flex items-baseline justify-between gap-2 border-b border-neo-white/10 font-bold',
            large ? 'py-1.5 font-neo-display text-lg' : 'py-1 text-sm',
            pulse?.word === w ? 'text-neo-orange' : w === lastFound ? 'text-neo-lime' : 'text-neo-white',
          )}
          initial={(w === lastFound || pulse?.word === w) && !reducedMotion ? { scale: 1.35, x: -12 } : false}
          animate={{ scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
        >
          <span className="truncate tracking-wide">{w}</span>
          <span className="text-xs font-black text-neo-lime/80 tabular-nums">+{scoreWord(w)}</span>
        </m.li>
      ))}
    </ul>
  );
}

export default function WordWheelFoundWords({
  t, words, lastFound, variant = 'strip', reducedMotion = false, pulse = null,
}: WordWheelFoundWordsProps) {
  const [open, setOpen] = useState(false);
  const newestFirst = [...words].reverse();

  if (variant === 'panel') {
    const longest = words.reduce((best, w) => (w.length > best.length ? w : best), '');
    return (
      <div data-testid="found-words-slot" className="flex flex-col min-h-0 h-full">
        <div className="flex items-center justify-between ps-4 pe-16 py-3 border-b-3 border-neo-black bg-neo-black/30 shrink-0">
          <span className="font-black text-neo-white text-sm uppercase tracking-wide">
            {t('wordWheel.strip.label', { count: words.length })}
          </span>
          <m.span
            key={words.length}
            data-testid="found-count"
            className="min-w-7 h-7 px-2 grid place-items-center rounded-full bg-neo-lime text-neo-black text-sm font-black tabular-nums border-2 border-neo-black"
            initial={words.length > 0 && !reducedMotion ? { scale: 1.6 } : false}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 14 }}
          >
            {words.length}
          </m.span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {words.length === 0 ? (
            <p className="text-neo-white/55 text-sm font-semibold">{t('wordWheel.strip.empty')}</p>
          ) : (
            <AllWords words={words} lastFound={lastFound} columns="grid-cols-2" reducedMotion={reducedMotion} large pulse={pulse} />
          )}
        </div>
        {longest && (
          <div className="shrink-0 px-4 py-3 border-t-2 border-neo-white/10 flex items-baseline justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wide text-neo-white/60">{t('wordWheel.strip.longest')}</span>
            <span className="font-neo-display font-black text-lg text-neo-lime tracking-wide truncate">{longest}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="found-words-slot" className="relative w-full h-11 shrink-0 z-20">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${t('wordWheel.strip.label', { count: words.length })}. ${t('wordWheel.strip.all')}`}
        onClick={() => setOpen(o => !o)}
        className="w-full h-11 flex items-center gap-2 px-3 rounded-neo border-2 border-neo-white/15 bg-neo-black/35 text-start touch-manipulation"
      >
        <div className="flex-1 min-w-0 overflow-hidden flex items-center gap-3 whitespace-nowrap [mask-image:linear-gradient(to_right,#000_80%,transparent)] rtl:[mask-image:linear-gradient(to_left,#000_80%,transparent)]">
          {words.length === 0 ? (
            <span className="text-neo-white/45 text-sm font-semibold">{t('wordWheel.strip.empty')}</span>
          ) : (
            newestFirst.map(w => (
              <m.span
                key={pulseKey(w, pulse)}
                data-testid="found-word"
                data-fresh={w === lastFound ? 'true' : 'false'}
                data-pulse={pulse?.word === w ? 'true' : undefined}
                className={cn(
                  'font-bold tracking-wide text-sm shrink-0',
                  pulse?.word === w ? 'text-neo-orange' : w === lastFound ? 'text-neo-lime' : 'text-neo-white/80',
                )}
                initial={reducedMotion ? false : { x: -24, scale: 1.3 }}
                animate={{ x: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              >
                {w}
              </m.span>
            ))
          )}
        </div>
        <m.span
          key={words.length}
          data-testid="found-count"
          className="min-w-6 h-6 px-1.5 grid place-items-center rounded-full bg-neo-lime text-neo-black text-xs font-black tabular-nums border-2 border-neo-black"
          initial={words.length > 0 && !reducedMotion ? { scale: 1.6 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 14 }}
        >
          {words.length}
        </m.span>
        <ChevronDown className={cn('w-4 h-4 text-neo-white/60 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="absolute top-full inset-x-0 mt-2 max-h-[46svh] overflow-y-auto p-3 rounded-neo border-3 border-neo-black bg-neo-navy-light shadow-hard-lg">
          {words.length === 0 ? (
            <p className="text-neo-white/55 text-sm font-semibold">{t('wordWheel.strip.empty')}</p>
          ) : (
            <AllWords words={words} lastFound={lastFound} columns="grid-cols-2" reducedMotion={reducedMotion} pulse={pulse} />
          )}
        </div>
      )}
    </div>
  );
}
