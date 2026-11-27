'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Pause, Play } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import HolidayMascotPop from '@/components/daily/holiday/HolidayMascotPop';
import { spawnBurst, type BurstKind } from '@/components/daily/holiday/holidayBurst';
import type { HolidayKey } from '@/lib/holidays/calendar';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';
import { cn } from '@/lib/utils';
import styles from './arcade.module.css';

interface ArcadeFx {
  paused: boolean;
  reduced: boolean;
  burstAt: (el: Element | null, kind: BurstKind, count?: number) => void;
  floatAt: (el: Element | null, text: string) => void;
  cheer: (line?: string) => void;
}

const LINE_MS = 2500;

const Ctx = createContext<ArcadeFx>({ paused: false, reduced: false, burstAt: () => {}, floatAt: () => {}, cheer: () => {} });
export const useArcadeFx = () => useContext(Ctx);

interface Props {
  holiday: HolidayKey;
  game: ArcadeGameId;
  score: number;
  onExit: () => void;
  children: ReactNode;
  overlay?: ReactNode;
}

export default function ArcadeShell({ holiday, game, score, onExit, children, overlay }: Props) {
  const { t } = useLanguage();
  const reduced = usePrefersReducedMotion();
  const layer = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [cue, setCue] = useState(0);
  const [line, setLine] = useState<string | undefined>();
  const lineTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(lineTimer.current), []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const local = useCallback((el: Element | null) => {
    const host = layer.current;
    if (!el || !host) return null;
    const a = el.getBoundingClientRect();
    const b = host.getBoundingClientRect();
    return { x: a.left - b.left + a.width / 2, y: a.top - b.top + a.height / 2 };
  }, []);

  const fx = useMemo<ArcadeFx>(
    () => ({
      paused: paused || !!overlay,
      reduced,
      burstAt: (el, kind, count) => {
        const p = local(el);
        if (p) spawnBurst(layer.current, p.x, p.y, kind, count);
      },
      floatAt: (el, text) => {
        const p = local(el);
        const host = layer.current;
        if (!p || !host) return;
        const span = document.createElement('span');
        span.className = cn(styles.floatUp, 'font-neo-display text-lg font-black text-neo-cream [text-shadow:2px_2px_0_rgb(var(--neo-black))]');
        span.textContent = text;
        span.style.left = `${p.x}px`;
        span.style.top = `${p.y - 10}px`;
        span.setAttribute('aria-hidden', 'true');
        span.addEventListener('animationend', () => span.remove(), { once: true });
        host.appendChild(span);
        window.setTimeout(() => span.remove(), 1200);
      },
      cheer: (l) => {
        setLine(l);
        setCue((n) => n + 1);
        window.clearTimeout(lineTimer.current);
        lineTimer.current = window.setTimeout(() => setLine(undefined), LINE_MS);
      },
    }),
    [paused, overlay, reduced, local],
  );

  return (
    <Ctx.Provider value={fx}>
      <div data-testid={`arcade-${game}`} className={cn(holiday === 'hanukkah' ? '[--arcade-accent:var(--neo-holiday-blue)]' : '[--arcade-accent:var(--neo-holiday-red)]', 'mx-auto flex w-full max-w-lg flex-[1_0_auto] flex-col gap-2 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-neo-white')}>
        <header className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            aria-label={t('holiday.arcade.back')}
            className="grid size-10 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
          >
            <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <h1 className="min-w-0 flex-1 truncate font-neo-display text-lg font-black">{t(`holiday.arcade.${game}.title`)}</h1>
          <output
            key={score}
            aria-label={t('holiday.arcade.scoreLabel')}
            className={cn('rounded-xl border-[3px] border-black bg-[var(--arcade-accent)] text-neo-white px-3 py-1 font-neo-display text-lg font-black tabular-nums shadow-hard', score > 0 && styles.pop)}
          >
            {score}
          </output>
          <button
            type="button"
            onClick={() => setPaused(true)}
            aria-label={t('holiday.arcade.pause')}
            className="grid size-10 shrink-0 place-items-center rounded-xl border-[3px] border-black bg-neo-navy-light shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
          >
            <Pause className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="flex min-h-16 items-center">
          <HolidayMascotPop holiday={holiday} cue={cue} line={line} className="flex-row-reverse items-center gap-2" bubbleClassName="mb-0 max-w-[15rem] text-sm" />
        </div>
        <div data-arcade-stage className={cn(styles.stage, 'flex flex-[1_0_auto] flex-col rounded-2xl border-[3px] border-black bg-neo-navy shadow-hard-lg')}>
          <div className="relative z-[1] flex flex-[1_0_auto] flex-col">{children}</div>
          <div ref={layer} className={styles.layer} aria-hidden="true" />
          {paused && !overlay && (
            <div className="absolute inset-0 z-40 grid place-items-center bg-neo-navy/85">
              <button
                type="button"
                autoFocus
                onClick={() => setPaused(false)}
                className="flex items-center gap-2 rounded-2xl border-[3px] border-black bg-[var(--arcade-accent)] text-neo-white px-6 py-3 font-neo-display text-xl font-black shadow-hard-lg"
              >
                <Play className="size-6" aria-hidden="true" />
                {t('holiday.arcade.resume')}
              </button>
            </div>
          )}
          {overlay && <div className="absolute inset-0 z-40 overflow-y-auto bg-neo-navy/90 p-3">{overlay}</div>}
        </div>
      </div>
    </Ctx.Provider>
  );
}
