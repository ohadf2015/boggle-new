'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import type { XpMoment } from './xpMomentModel';

const FILL_MS = 700;
const COUNT_MS = 900;
const COUNT_STEPS = 18;

interface Playback {
  seg: number;
  width: number;
  count: number;
  popped: boolean;
  instant: boolean;
}

function finalState(m: XpMoment): Playback {
  const last = m.segments.length - 1;
  return { seg: last, width: m.segments[last].toPct, count: m.gained, popped: m.levelUp, instant: true };
}

function usePlayback(m: XpMoment, reduced: boolean): Playback {
  const [state, setState] = useState<Playback>(() => (reduced ? finalState(m) : { seg: 0, width: m.segments[0].fromPct, count: 0, popped: false, instant: true }));
  const key = `${m.gained}:${m.to.level}:${m.to.xpIntoLevel}`;

  useEffect(() => {
    if (reduced) {
      setState(finalState(m));
      return;
    }
    const [first, second] = m.segments;
    setState({ seg: 0, width: first.fromPct, count: 0, popped: false, instant: true });
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    at(60, () => setState((s) => ({ ...s, width: first.toPct, instant: false })));
    for (let i = 1; i <= COUNT_STEPS; i++) {
      at((COUNT_MS / COUNT_STEPS) * i, () => setState((s) => ({ ...s, count: Math.round((m.gained * i) / COUNT_STEPS) })));
    }
    if (second) {
      at(60 + FILL_MS + 40, () => setState((s) => ({ ...s, seg: 1, width: second.fromPct, popped: true, instant: true })));
      at(60 + FILL_MS + 100, () => setState((s) => ({ ...s, width: second.toPct, instant: false })));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one run per data identity (key), not per object
  }, [key, reduced]);

  return state;
}

export function XpMomentMeter({ moment, saved = true }: { moment: XpMoment; saved?: boolean }) {
  const { t, language } = useLanguage();
  const reduced = usePrefersReducedMotion();
  const play = usePlayback(moment, reduced);
  const level = moment.segments[Math.min(play.seg, moment.segments.length - 1)].level;
  const width = Math.round(play.width);
  const toGo = moment.to.isMax ? 0 : moment.to.xpForNext - moment.to.xpIntoLevel;

  return (
    <div data-testid="xp-moment" className="flex flex-col gap-1.5 rounded-neo border-2 border-neo-black bg-neo-navy-light px-3 py-2 shadow-hard-sm">
      <div className="flex items-center gap-2">
        <span
          data-testid="xp-moment-gained"
          className="font-neo-display text-xl font-black leading-none text-neo-lime tabular-nums"
        >
          <bdi>{t('progression.xp.gained', { xp: play.count.toLocaleString(language) })}</bdi>
        </span>
        {!saved && (
          <span data-testid="xp-moment-not-saved" className="rounded-neo-pill border-2 border-neo-black bg-neo-pink px-2 py-0.5 text-[10px] font-black uppercase text-neo-black">
            {t('progression.xp.notSaved')}
          </span>
        )}
        {play.popped && (
          <span
            data-testid="xp-moment-levelup"
            className="ms-auto rounded-neo-pill border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase text-neo-black shadow-hard-sm animate-mp-stamp"
          >
            {t('progression.xp.levelUp', { level: moment.to.level })}
          </span>
        )}
      </div>
      {saved && (
        <div className="flex items-center gap-2">
          <span
            data-testid="xp-moment-level"
            className="flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-lime px-1 font-neo-display text-xs font-black text-neo-navy"
          >
            {level}
          </span>
          <div
            data-testid="xp-moment-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={width}
            aria-label={t('progression.xp.toNextLevel', { xp: toGo.toLocaleString(language), level: moment.to.level + 1 })}
            className="h-3 flex-1 overflow-hidden rounded-full border-2 border-neo-black bg-neo-black/40"
          >
            <div
              className={cn('h-full rounded-full bg-neo-lime', !play.instant && 'transition-[width] ease-out')}
              style={{ width: `${width}%`, transitionDuration: play.instant ? undefined : `${FILL_MS}ms` }}
            />
          </div>
        </div>
      )}
      {saved && !moment.to.isMax && (
        <p className="text-[11px] font-bold text-neo-cream/70">
          <bdi>{t('progression.xp.toNextLevel', { xp: toGo.toLocaleString(language), level: moment.to.level + 1 })}</bdi>
        </p>
      )}
    </div>
  );
}
