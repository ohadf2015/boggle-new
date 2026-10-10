'use client';

import React, { useEffect, useRef } from 'react';
import { CoinArt } from '@/components/ui/CoinArt';

type Point = { x: number; y: number };

export interface DomCoinBurstProps {
  source: Point;
  target: Point;
  count: number;
  onDone: () => void;
  /** Fires as coin `index` hits the target (counters tick and chimes play on it). */
  onLand?: (index: number) => void;
}

const FAN_MS = 170;
const TRAVEL_MS = 430;
const STAGGER_MS = 40;
const IMPACT_MS = 280;
const MAX_COINS = 12;
const COIN_PX = 26;
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

const translate = (p: Point, scale: number, rot: number) =>
  `translate(${p.x - COIN_PX / 2}px, ${p.y - COIN_PX / 2}px) rotate(${rot}deg) scale(${scale})`;

/** Pop out of the source in a fan, then get sucked along an arc into the target. */
function flightKeyframes(source: Point, target: Point, i: number, n: number, alpha: number, sizeMul: number): Keyframe[] {
  const spread = n === 1 ? 0 : i / (n - 1) - 0.5;
  const angle = -Math.PI / 2 + spread * Math.PI * 0.95;
  const radius = 44 + (i % 3) * 14;
  const fan = { x: source.x + Math.cos(angle) * radius, y: source.y + Math.sin(angle) * radius };
  const side = i % 2 === 0 ? 1 : -1;
  const control = {
    x: (fan.x + target.x) / 2 + side * (36 + (i % 4) * 16),
    y: Math.min(fan.y, target.y) - 50 - (i % 3) * 22,
  };
  const spin = side * (200 + (i % 3) * 90);
  const fanAt = FAN_MS / (FAN_MS + TRAVEL_MS);
  const frames: Keyframe[] = [
    { offset: 0, transform: translate(source, 0.3 * sizeMul, 0), opacity: 0 },
    { offset: 0.05, transform: translate(source, 0.7 * sizeMul, spin * 0.05), opacity: alpha },
    { offset: fanAt, transform: translate(fan, 1.3 * sizeMul, spin * 0.3), opacity: alpha, easing: 'linear' },
  ];
  const steps = 6;
  for (let k = 1; k <= steps; k++) {
    const u = Math.pow(k / steps, 1.45);
    const a = 1 - u;
    const p = {
      x: a * a * fan.x + 2 * a * u * control.x + u * u * target.x,
      y: a * a * fan.y + 2 * a * u * control.y + u * u * target.y,
    };
    const scale = (1.3 - 0.75 * (k / steps)) * sizeMul;
    frames.push({
      offset: fanAt + (1 - fanAt) * (k / steps),
      transform: translate(p, scale, spin * (0.3 + 0.7 * (k / steps))),
      opacity: alpha,
    });
  }
  return frames;
}

/**
 * Coins burst out of where they were earned, streak along an arc with comet
 * trails, and slam into the wallet counter with an impact ring. Pure DOM + Web
 * Animations (compositor-only transforms), finite, self-removing.
 */
export function DomCoinBurst({ source, target, count, onDone, onLand }: DomCoinBurstProps) {
  const n = Math.min(MAX_COINS, Math.max(1, Math.floor(count)));
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const landRef = useRef(onLand);
  landRef.current = onLand;

  const { x: sx, y: sy } = source;
  const { x: tx, y: ty } = target;

  useEffect(() => {
    const from = { x: sx, y: sy };
    const to = { x: tx, y: ty };
    const root = rootRef.current;
    const timing = coinFlightTiming(n);
    const animations: Animation[] = [];
    if (root && typeof root.animate === 'function') {
      root.querySelectorAll<HTMLElement>('[data-coin-index]').forEach((el) => {
        const i = Number(el.dataset.coinIndex);
        const trail = Number(el.dataset.trail ?? -1);
        const t = trail >= 0 ? TRAILS[trail] : { lag: 0, alpha: 1, scale: 1 };
        animations.push(
          el.animate(flightKeyframes(from, to, i, n, t.alpha, t.scale), {
            duration: FAN_MS + TRAVEL_MS,
            delay: i * STAGGER_MS + t.lag,
            easing: 'cubic-bezier(0.3, 0, 0.6, 1)',
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
    timers.push(setTimeout(() => doneRef.current(), timing.totalMs));
    return () => {
      timers.forEach(clearTimeout);
      animations.forEach((a) => a.cancel());
    };
  }, [n, sx, sy, tx, ty]);

  const coins: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    TRAILS.forEach((_, tr) => {
      coins.push(
        <span
          key={`t${i}-${tr}`}
          data-coin-index={i}
          data-trail={tr}
          className="absolute left-0 top-0 rounded-full bg-neo-yellow"
          style={{ width: COIN_PX, height: COIN_PX, opacity: 0, willChange: 'transform', filter: 'blur(1.5px)' }}
        />,
      );
    });
    coins.push(
      <span
        key={`c${i}`}
        data-testid="flying-coin"
        data-coin-index={i}
        className="absolute left-0 top-0"
        style={{ width: COIN_PX, height: COIN_PX, opacity: 0, willChange: 'transform', filter: 'drop-shadow(0 0 6px rgba(255,197,61,0.85))' }}
      >
        <CoinArt size={COIN_PX} />
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
    >
      {coins}
      <span
        data-impact
        className="absolute rounded-full border-4 border-neo-yellow"
        style={{ left: target.x, top: target.y, width: 44, height: 44, opacity: 0, boxShadow: '0 0 18px rgba(255,197,61,0.9)' }}
      />
    </div>
  );
}

export default DomCoinBurst;
