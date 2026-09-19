'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Hammer, Send, X } from 'lucide-react';
import type { WreckUpdate } from './WreckCanvas';

const WreckCanvas = dynamic(() => import('./WreckCanvas'), { ssr: false });

type T = (key: string, params?: Record<string, string | number>) => string;

/**
 * Smash round overlay: the rival's tower, a wrecking ball on a chain, one tap
 * per ball. The whole screen is the tap target — the ball is the only thing to
 * do here — with a big labelled button for keyboard and screen readers.
 */
export function WreckScene({
  t, title, words, balls, reducedMotion, onShare, onClose,
}: {
  t: T;
  /** Already translated: "Dana's tower" or "Your tower". */
  title: string;
  words: string[];
  balls: number;
  reducedMotion: boolean;
  onShare: () => void;
  onClose: () => void;
}) {
  const cutRef = useRef<() => void>(() => {});
  const [state, setState] = useState<WreckUpdate>({ wrecked: 0, total: words.length, ballsLeft: balls - 1, armed: true, done: false, hits: 0 });
  const [crash, setCrash] = useState(0);
  const lastHits = useRef(0);

  const onUpdate = useCallback((u: WreckUpdate) => {
    setState(u);
    if (u.hits > lastHits.current) {
      lastHits.current = u.hits;
      setCrash(u.hits);
    }
  }, []);
  const registerCut = useCallback((cut: () => void) => {
    cutRef.current = cut;
  }, []);

  useEffect(() => {
    if (!crash) return;
    const id = window.setTimeout(() => setCrash(0), 700);
    return () => window.clearTimeout(id);
  }, [crash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        cutRef.current();
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);


  const pct = state.total ? Math.round((state.wrecked / state.total) * 100) : 0;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-neo-navy" role="dialog" aria-modal="true">
      {/* Pixi paints sky, city and ground (80% down) itself. */}
      <WreckCanvas words={words} balls={balls} reducedMotion={reducedMotion} registerCut={registerCut} onUpdate={onUpdate} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-col items-center gap-2 px-4">
        <h2 className="rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard">
          {title}
        </h2>
        <div className="flex items-center gap-2 font-neo-display text-lg font-black text-neo-cream">
          <span className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy/85 px-2 tabular-nums">
            {state.wrecked}/{state.total}
          </span>
          <span className="flex gap-1" aria-label={t('wordTowerV2.wreck.balls', { n: state.ballsLeft + (state.armed ? 1 : 0) })}>
            {Array.from({ length: state.ballsLeft + (state.armed ? 1 : 0) }, (_, i) => (
              <span key={i} className="h-5 w-5 rounded-full border-neo border-black bg-[#2b2f45] shadow-hard-sm" />
            ))}
          </span>
        </div>
      </div>

      {/* Always a way out (Escape too) — the round is a dialog, not a trap. */}
      {!state.done ? (
        <button
          type="button"
          onClick={onClose}
          aria-label={t('wordTowerV2.wreck.back')}
          className="absolute end-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      ) : null}

      {crash ? (
        <div
          key={crash}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[30%] z-20 mx-auto w-fit -rotate-6 rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-1 font-neo-display text-5xl font-black uppercase text-neo-navy shadow-hard-lg animate-neo-pop"
        >
          {t('wordTowerV2.wreck.crash')}
        </div>
      ) : null}

      {!state.done ? (
        <button
          type="button"
          onClick={() => cutRef.current()}
          disabled={!state.armed}
          aria-label={t('wordTowerV2.wreck.cut')}
          className="absolute inset-0 z-10 flex items-end justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] disabled:cursor-default"
        >
          <span
            className={
              state.armed
                ? 'flex items-center gap-2 rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-2xl font-black uppercase text-neo-navy shadow-hard'
                : 'invisible'
            }
          >
            <Hammer className="h-6 w-6" aria-hidden />
            {t('wordTowerV2.wreck.cut')}
          </span>
        </button>
      ) : (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-neo-navy/60 p-4">
          <div className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-cream p-5 text-center text-neo-navy shadow-hard-lg animate-neo-pop">
            <p className="font-neo-display text-3xl font-black uppercase">
              {t('wordTowerV2.wreck.result', { n: state.wrecked, total: state.total })}
            </p>
            <p className="mt-1 font-neo-display text-6xl font-black tabular-nums">{pct}%</p>
            <button
              type="button"
              onClick={onShare}
              autoFocus
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-cyan px-6 py-3 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              <Send className="h-5 w-5" aria-hidden />
              {t('wordTowerV2.wreck.share')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full rounded-neo border-neo-thick border-black bg-neo-pink px-6 py-3 font-neo-display text-xl font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
            >
              {t('wordTowerV2.wreck.back')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
