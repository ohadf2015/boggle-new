'use client';

import type React from 'react';

// Celebration layers for the quick-play results hero. Big layers only rotate;
// anything that fades is small (a full-screen opacity tween flashes on mobile).

type Point = { x: number; y: number };

const MAX_CONFETTI = 16;
const MAX_COINS = 8;
const CONFETTI_COLORS = ['#bfff00', '#ff4d9a', '#22d3ee', '#ffe135', '#c084fc'];
const BURST_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const SPARK_SLOTS = [
  { left: '22%', top: '18%', delay: '1.0s', color: 'text-neo-yellow', size: 'h-4 w-4' },
  { left: '74%', top: '26%', delay: '1.9s', color: 'text-neo-lime', size: 'h-3 w-3' },
  { left: '30%', top: '72%', delay: '2.8s', color: 'text-neo-pink', size: 'h-3 w-3' },
];

const vars = (v: Record<string, string>) => v as React.CSSProperties;

export function QuickResultsRays({ color, spinning }: { color: string; spinning: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="quick-results-rays"
      data-spinning={spinning ? 'true' : 'false'}
      className="pointer-events-none absolute left-1/2 top-1/2 h-[1200px] w-[1200px] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,black_6%,transparent_72%)]"
    >
      <div
        className={`h-full w-full ${spinning ? 'animate-[qp-ray-spin_26s_linear_infinite]' : ''}`}
        style={{ background: `repeating-conic-gradient(from 0deg, ${color}3d 0deg 6deg, transparent 6deg 20deg)` }}
      />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(closest-side, ${color}59 0%, ${color}1a 18%, transparent 34%)` }}
      />
    </div>
  );
}

export function BurstLines({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      {BURST_ANGLES.map((a) => (
        <span
          key={a}
          className="absolute -left-[3px] -top-[10px] h-5 w-1.5 rounded-full bg-neo-yellow animate-[qp-burst_0.7s_cubic-bezier(0.2,0.7,0.3,1)_0.38s_both]"
          style={vars({ '--a': `${a}deg` })}
        />
      ))}
    </div>
  );
}

export function ConfettiPuff({ count, enabled }: { count: number; enabled: boolean }) {
  const n = Math.min(MAX_CONFETTI, Math.max(0, Math.floor(count)));
  if (!enabled || n === 0) return null;
  return (
    <div aria-hidden="true" data-testid="quick-confetti" className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      {Array.from({ length: n }, (_, i) => {
        const angle = (i / n) * Math.PI * 2 + (i % 3) * 0.35;
        const reach = 90 + ((i * 37) % 70);
        return (
          <span
            key={i}
            data-piece
            className={`absolute -left-1 -top-1 ${i % 3 === 0 ? 'h-2 w-2 rounded-full' : 'h-2.5 w-1.5 rounded-[2px]'}`}
            style={{
              ...vars({
                '--x': `${Math.round(Math.cos(angle) * reach)}px`,
                '--y': `${Math.round(Math.sin(angle) * reach * 0.6 - 70)}px`,
                '--r': `${(i % 2 ? 1 : -1) * (180 + i * 25)}deg`,
              }),
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationName: 'qp-confetti',
              animationDuration: `${1.15 + (i % 4) * 0.1}s`,
              animationDelay: `${0.32 + (i % 5) * 0.03}s`,
              animationTimingFunction: 'cubic-bezier(0.15, 0.7, 0.4, 1)',
              animationFillMode: 'both',
              animationIterationCount: '1',
            }}
          />
        );
      })}
    </div>
  );
}

export function SparkleLoop({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div aria-hidden="true" data-testid="quick-results-sparkles" className="pointer-events-none absolute inset-0">
      {SPARK_SLOTS.map((slot) => (
        <span
          key={slot.left}
          data-spark
          className={`absolute ${slot.size} ${slot.color} animate-[qp-spark_2.7s_ease-out_infinite_both]`}
          style={{ left: slot.left, top: slot.top, animationDelay: slot.delay }}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
            <path d="M12 0 L14.2 9.8 L24 12 L14.2 14.2 L12 24 L9.8 14.2 L0 12 L9.8 9.8 Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

export function CoinIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={className}>
      <circle cx="10" cy="10" r="9" fill="#ffe135" stroke="#000" strokeWidth="2" />
      <circle cx="10" cy="10" r="5.2" fill="none" stroke="#c99a00" strokeWidth="1.8" />
      <path d="M6.5 6.2 Q8 4.6 10 4.4" stroke="#fff8c4" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Ms after mount when the first coin leaves the reward chip; the wallet ticks as they land. */
export const COIN_FLIGHT_START_MS = 1100;
export const COIN_FLIGHT_LAND_MS = 1950;

export function CoinFlight({
  count,
  from,
  to,
  enabled,
}: {
  count: number;
  from: Point | null;
  to: Point | null;
  enabled: boolean;
}) {
  const n = Math.min(MAX_COINS, Math.max(0, Math.floor(count)));
  if (!enabled || n === 0 || !from || !to) return null;
  return (
    <div aria-hidden="true" data-testid="quick-coin-flight" className="pointer-events-none fixed inset-0 z-50">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          data-coin
          className="absolute h-0 w-0 animate-[qp-coin-x_0.78s_cubic-bezier(0.3,0.1,0.5,1)_both]"
          style={{
            left: from.x,
            top: from.y,
            animationDelay: `${COIN_FLIGHT_START_MS / 1000 + i * 0.07}s`,
            ...vars({ '--dx': `${Math.round(to.x - from.x)}px`, '--dy': `${Math.round(to.y - from.y)}px` }),
          }}
        >
          <span
            className="absolute -left-2.5 -top-2.5 block h-5 w-5 animate-[qp-coin-y_0.78s_cubic-bezier(0.55,0,0.85,0.45)_both]"
            style={vars({ animationDelay: `${COIN_FLIGHT_START_MS / 1000 + i * 0.07}s`, '--jx': `${((i % 3) - 1) * 14}px` })}
          >
            <CoinIcon className="h-full w-full" />
          </span>
        </span>
      ))}
    </div>
  );
}
