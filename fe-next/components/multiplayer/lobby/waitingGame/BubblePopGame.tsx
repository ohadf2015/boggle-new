'use client';

import { useEffect, useRef, useState } from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import useReducedMotion from '@/hooks/useReducedMotion';
import { ROUND_MS, START, makeBubble, missBubble, scorePop, spawnDelay, writeBest, type Bubble, type PopState } from './bubblePopLogic';
import styles from './bubblePop.module.css';

type T = (path: string, params?: Record<string, string | number>) => string;
type Live = Bubble & { pts?: number };

const TICK_MS = 250;
const STILL_MAX = 4;
const TONE = { pink: 'bg-neo-pink', cyan: 'bg-neo-cyan', lime: 'bg-neo-lime', purple: 'bg-neo-purple' } as const;

interface BubblePopGameProps {
  t: T;
  best: number;
  onBest: (score: number) => void;
  onClose: () => void;
}

/**
 * Lobby "Bubble Pop": tap rising bubbles, chain pops for a combo, 20s rounds.
 * Purely local; the lobby unmounting at game start tears every timer down.
 * Bubbles rise on the compositor (CSS keyframes); React only spawns and scores.
 */
export function BubblePopGame({ t, best, onBest, onClose }: BubblePopGameProps) {
  const still = useReducedMotion();
  const [phase, setPhase] = useState<'ready' | 'playing' | 'over'>('ready');
  const [bubbles, setBubbles] = useState<Live[]>([]);
  const [pop, setPop] = useState<PopState>(START);
  const [left, setLeft] = useState(ROUND_MS);
  const [paused, setPaused] = useState(false);
  const [spawns, setSpawns] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef(START);
  const leftRef = useRef(ROUND_MS);
  leftRef.current = left;
  const live = phase === 'playing' && !paused;

  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'nearest' });
    const sync = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setLeft((l) => Math.max(0, l - TICK_MS)), TICK_MS);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!live) return;
    const id = setTimeout(() => {
      setBubbles((bs) => (still && bs.length >= STILL_MAX ? bs : [...bs, makeBubble(spawns)]));
      setSpawns((n) => n + 1);
    }, spawnDelay(ROUND_MS - leftRef.current));
    return () => clearTimeout(id);
  }, [live, spawns, still]);

  useEffect(() => {
    if (phase !== 'playing' || left > 0) return;
    setPhase('over');
    setBubbles([]);
    if (writeBest(popRef.current.score)) {
      setNewBest(true);
      onBest(popRef.current.score);
    }
  }, [phase, left, onBest]);

  const score = (next: PopState) => {
    popRef.current = next;
    setPop(next);
  };
  const remove = (id: number) => setBubbles((bs) => bs.filter((b) => b.id !== id));

  const tap = (b: Live, at: number) => {
    if (b.pts !== undefined || !live) return;
    const prev = popRef.current;
    const next = scorePop(prev, b.kind, at);
    score(next);
    if (still) remove(b.id);
    else setBubbles((bs) => bs.map((x) => (x.id === b.id ? { ...x, pts: next.score - prev.score } : x)));
  };

  const escape = (b: Live) => {
    remove(b.id);
    if (b.pts === undefined) score(missBubble(popRef.current));
  };

  const go = () => {
    score(START);
    setLeft(ROUND_MS);
    setNewBest(false);
    setBubbles([]);
    setPhase('playing');
  };

  return (
    <div ref={rootRef} data-testid="bubble-pop" className="flex flex-col gap-2 rounded-neo border-3 border-neo-black bg-neo-navy p-2 shadow-hard-sm">
      <div className="flex items-center gap-2 font-neo-display font-bold text-sm text-neo-white">
        <span className="truncate text-neo-pink uppercase tracking-wide">{t('lobby.fun.title')}</span>
        {pop.combo >= 2 && (
          <span key={pop.combo} className={cn('shrink-0 rounded-full border-2 border-neo-black bg-neo-yellow px-2 text-xs text-neo-black', styles.comboIn)}>
            {t('lobby.fun.combo', { count: pop.combo })}
          </span>
        )}
        <span className="ms-auto shrink-0 tabular-nums" data-testid="bubble-score">{pop.score}</span>
        <span className="shrink-0 rounded-neo border-2 border-neo-black bg-neo-navy-light px-1.5 text-xs tabular-nums text-neo-cyan" data-testid="bubble-clock">
          {t('lobby.fun.seconds', { seconds: Math.ceil(left / 1000) })}
        </span>
        <button
          type="button"
          data-testid="bubble-close"
          onClick={onClose}
          aria-label={t('lobby.fun.close')}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white active:translate-y-0.5"
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      </div>
      <div
        data-testid="bubble-arena"
        data-paused={String(paused)}
        data-static={String(still)}
        className={cn('relative h-44 overflow-hidden rounded-neo border-2 border-neo-black bg-neo-navy-light touch-manipulation select-none', styles.arena)}
      >
        {phase === 'playing' && bubbles.map((b) => (
          <div
            key={b.id}
            className={cn('absolute inset-0 pointer-events-none', !still && styles.rise)}
            style={{ animationDuration: `${b.riseMs}ms` }}
            onAnimationEnd={(e) => { if (e.target === e.currentTarget) escape(b); }}
          >
            <button
              type="button"
              data-testid="bubble"
              aria-label={t('lobby.fun.bubble')}
              onPointerDown={(e) => tap(b, e.timeStamp)}
              onClick={(e) => { if (e.detail === 0) tap(b, e.timeStamp); }}
              onAnimationEnd={(e) => { e.stopPropagation(); if (b.pts !== undefined) remove(b.id); }}
              className={cn(
                'pointer-events-auto absolute flex items-center justify-center rounded-full border-[3px] border-neo-black shadow-hard-sm',
                b.kind === 'star' ? 'bg-neo-yellow' : TONE[b.tone],
                b.pts !== undefined ? styles.popped : styles.bubble,
              )}
              style={{ left: `${b.x}%`, top: still ? `${12 + ((b.id * 37) % 58)}%` : 0, width: b.size, height: b.size, marginLeft: -b.size / 2 }}
            >
              {b.kind === 'star' ? (
                <Star aria-hidden="true" className="w-6 h-6 fill-neo-white stroke-neo-black stroke-2" />
              ) : (
                <span aria-hidden="true" className="flex flex-col items-center gap-0.5">
                  <span className="flex gap-2"><i className="block w-1.5 h-1.5 rounded-full bg-neo-black" /><i className="block w-1.5 h-1.5 rounded-full bg-neo-black" /></span>
                  <i className="block w-2.5 h-1 rounded-b-full bg-neo-black" />
                </span>
              )}
              {b.pts !== undefined && <span className="absolute -top-5 font-neo-display text-sm font-bold text-neo-white" dir="ltr">+{b.pts}</span>}
            </button>
          </div>
        ))}
        {phase !== 'playing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
            {phase === 'over' ? (
              <p className="font-neo-display text-2xl font-bold text-neo-white tabular-nums">{pop.score}</p>
            ) : (
              <p className="max-w-[16rem] font-neo-body text-sm font-bold text-neo-white/85">{t('lobby.fun.howTo')}</p>
            )}
            {newBest && <p data-testid="bubble-new-best" className={cn('rounded-full border-2 border-neo-black bg-neo-lime px-3 py-0.5 font-neo-display text-xs font-bold uppercase text-neo-black', styles.comboIn)}>{t('lobby.fun.newBest')}</p>}
            {phase === 'over' && !newBest && best > 0 && <p className="text-xs font-bold text-neo-white/70">{t('lobby.fun.best', { score: best })}</p>}
            <button
              type="button"
              data-testid="bubble-go"
              onClick={go}
              className="h-11 px-6 rounded-neo border-3 border-neo-black bg-neo-pink font-neo-display font-bold uppercase text-neo-black shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none"
            >
              {t(phase === 'over' ? 'lobby.fun.again' : 'lobby.fun.go')}
            </button>
          </div>
        )}
        {paused && phase === 'playing' && (
          <p className="absolute inset-x-0 top-2 text-center font-neo-display text-sm font-bold uppercase text-neo-white/80">{t('lobby.fun.paused')}</p>
        )}
      </div>
    </div>
  );
}
