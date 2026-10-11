'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CoinArt } from '@/components/ui/CoinArt';
import { coinFlightPlan, type CoinFlightPlan, type Point, type Rect } from './coinFlightPath';
import { CoinJackpot, JACKPOT_MS } from './CoinJackpot';

export interface DomCoinBurstProps {
  source: Point;
  target: Point;
  count: number;
  onDone: () => void;
  /** Fires as coin `index` hits the target (counters tick and chimes play on it). */
  onLand?: (index: number) => void;
  /** Screen areas the coins steer around (the praise stamp). */
  avoid?: Rect[];
  /** A big word: wider spray, bigger coins and a "+N" stamp with a gold burst at the word. */
  big?: boolean;
  /** The "+N" text for a big earn. */
  amountLabel?: string;
}

const FAN_MS = 170;
const TRAVEL_MS = 430;
const STAGGER_MS = 40;
const IMPACT_MS = 280;
const MAX_COINS = 12;
const TRAILS = [
  { lag: 34, alpha: 0.5, scale: 0.82 },
  { lag: 68, alpha: 0.22, scale: 0.64 },
];

export function coinFlightTiming(count: number) {
  const n = Math.min(MAX_COINS, Math.max(1, Math.floor(count)));
  const firstLandMs = FAN_MS + TRAVEL_MS;
  const lastLandMs = firstLandMs + (n - 1) * STAGGER_MS;
  return { firstLandMs, lastLandMs, totalMs: lastLandMs + IMPACT_MS };
}

export const coinSizeFor = (viewportWidth: number) => (viewportWidth >= 1200 ? 44 : 30);

const translate = (p: Point, scale: number, rot: number, px: number) =>
  `translate(${p.x - px / 2}px, ${p.y - px / 2}px) rotate(${rot}deg) scale(${scale})`;

const flightDuration = (i: number) => FAN_MS + i * STAGGER_MS + TRAVEL_MS;

/** Burst out of the source together, hover, then get sucked one by one into the target. */
function flightKeyframes(source: Point, i: number, plan: CoinFlightPlan, alpha: number, sizeMul: number, px: number): Keyframe[] {
  const side = i % 2 === 0 ? 1 : -1;
  const spin = side * (200 + (i % 3) * 90);
  const total = flightDuration(i);
  const fanAt = FAN_MS / total;
  const departAt = (FAN_MS + i * STAGGER_MS) / total;
  const frames: Keyframe[] = [
    { offset: 0, transform: translate(source, 0.55 * sizeMul, 0, px), opacity: alpha, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.25)' },
    { offset: fanAt, transform: translate(plan.fan, 1.3 * sizeMul, spin * 0.2, px), opacity: alpha, easing: 'ease-in-out' },
  ];
  if (departAt > fanAt) frames.push({ offset: departAt, transform: translate(plan.hover, 1.25 * sizeMul, spin * 0.3, px), opacity: alpha });
  plan.route.forEach((p, k) => {
    const last = k === plan.route.length - 1;
    const f = plan.at[k];
    frames.push({
      offset: departAt + (1 - departAt) * f,
      transform: translate(p, (last ? 0.35 : 1.25 - 0.55 * f) * sizeMul, spin * (0.3 + 0.7 * f), px),
      opacity: last ? 0 : alpha,
    });
  });
  return frames;
}

const rectKey = (r: Rect) => `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`;

/**
 * Coins burst out of where they were earned, streak toward the wallet with comet
 * trails (around the praise stamp, never over it), and slam into the counter with
 * an impact ring. Pure DOM + Web Animations (compositor-only transforms), finite,
 * self-removing.
 */
export function DomCoinBurst({ source, target, count, onDone, onLand, avoid = [], big = false, amountLabel }: DomCoinBurstProps) {
  const n = Math.min(MAX_COINS, Math.max(1, Math.floor(count)));
  const [px] = useState(() => coinSizeFor(typeof window === 'undefined' ? 0 : window.innerWidth));
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const landRef = useRef(onLand);
  landRef.current = onLand;
  const avoidRef = useRef(avoid);
  avoidRef.current = avoid;

  const { x: sx, y: sy } = source;
  const { x: tx, y: ty } = target;
  const avoidKey = avoid.map(rectKey).join(';');

  useEffect(() => {
    const from = { x: sx, y: sy };
    const to = { x: tx, y: ty };
    const viewport = { w: window.innerWidth, h: window.innerHeight };
    const root = rootRef.current;
    const timing = coinFlightTiming(n);
    const sizeMul = big ? 1.15 : 1;
    const plans = Array.from({ length: n }, (_, i) =>
      coinFlightPlan({ source: from, target: to, i, n, px: px * sizeMul, avoid: avoidRef.current, viewport, big }),
    );
    const animations: Animation[] = [];
    if (root && typeof root.animate === 'function') {
      root.querySelectorAll<HTMLElement>('[data-coin-index]').forEach((el) => {
        const i = Number(el.dataset.coinIndex);
        const trail = Number(el.dataset.trail ?? -1);
        const t = trail >= 0 ? TRAILS[trail] : { lag: 0, alpha: 1, scale: 1 };
        animations.push(
          el.animate(flightKeyframes(from, i, plans[i], t.alpha, t.scale * sizeMul, px), {
            duration: flightDuration(i),
            delay: t.lag,
            easing: 'linear',
            fill: 'none',
          }),
        );
      });
      root.querySelectorAll<HTMLElement>('[data-impact]').forEach((el) => {
        animations.push(
          el.animate(
            [
              { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
              { transform: 'translate(-50%, -50%) scale(2.2)', opacity: 0 },
            ],
            { duration: 420, delay: timing.firstLandMs, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'none' },
          ),
        );
      });
    }
    const timers = Array.from({ length: n }, (_, i) =>
      setTimeout(() => landRef.current?.(i), timing.firstLandMs + i * STAGGER_MS),
    );
    timers.push(setTimeout(() => doneRef.current(), big ? Math.max(timing.totalMs, JACKPOT_MS) : timing.totalMs));
    return () => {
      timers.forEach(clearTimeout);
      animations.forEach((a) => a.cancel());
    };
  }, [n, sx, sy, tx, ty, px, big, avoidKey]);

  const coins: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    TRAILS.forEach((_, tr) => {
      coins.push(
        <span
          key={`t${i}-${tr}`}
          data-coin-index={i}
          data-trail={tr}
          className="absolute left-0 top-0 rounded-full bg-neo-yellow"
          style={{ width: px, height: px, opacity: 0, willChange: 'transform', filter: 'blur(1.5px)' }}
        />,
      );
    });
    coins.push(
      <span
        key={`c${i}`}
        data-testid="flying-coin"
        data-coin-index={i}
        className="absolute left-0 top-0"
        style={{ width: px, height: px, opacity: 0, willChange: 'transform', filter: 'drop-shadow(0 0 6px rgba(255,197,61,0.85))' }}
      >
        <CoinArt size={px} />
      </span>,
    );
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden"
      aria-hidden="true"
      data-testid="dom-coin-burst"
      data-from={`${Math.round(source.x)},${Math.round(source.y)}`}
      data-to={`${Math.round(target.x)},${Math.round(target.y)}`}
      data-avoid={avoidKey || undefined}
    >
      {big && <CoinJackpot source={source} avoid={avoid} label={amountLabel ?? ''} part="burst" />}
      {coins}
      <span
        data-impact
        className="absolute rounded-full border-4 border-neo-yellow"
        style={{ left: target.x, top: target.y, width: 44, height: 44, opacity: 0, boxShadow: '0 0 18px rgba(255,197,61,0.9)' }}
      />
      {big && <CoinJackpot source={source} avoid={avoid} label={amountLabel ?? ''} part="stamp" />}
    </div>
  );
}

export default DomCoinBurst;
