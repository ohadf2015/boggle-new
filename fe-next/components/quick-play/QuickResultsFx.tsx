'use client';

import type React from 'react';

// Celebration layers for the quick-play results hero. Big layers only rotate;
// anything that fades is small (a full-screen opacity tween flashes on mobile).

const MAX_CONFETTI = 16;
const CONFETTI_COLORS = ['#bfff00', '#ff4d9a', '#22d3ee', '#ffe135', '#c084fc'];
const BURST_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
const SPARK_SLOTS = [
  { left: '20%', top: '16%', delay: '1.0s', color: 'text-neo-yellow', size: 'h-6 w-6' },
  { left: '76%', top: '24%', delay: '1.7s', color: 'text-neo-lime', size: 'h-5 w-5' },
  { left: '28%', top: '70%', delay: '2.4s', color: 'text-neo-pink', size: 'h-4 w-4' },
  { left: '70%', top: '66%', delay: '3.1s', color: 'text-neo-cyan', size: 'h-5 w-5' },
];

const vars = (v: Record<string, string>) => v as React.CSSProperties;

/** [start, width] in degrees — uneven on purpose so no two moments of the turn look alike. */
const MAIN_RAYS: Array<[number, number]> = [
  [0, 9], [24, 5], [41, 12], [70, 6], [92, 10], [121, 4], [138, 11], [166, 7],
  [190, 13], [222, 5], [240, 9], [268, 6], [289, 12], [318, 4], [334, 8],
];
const FINE_RAYS: Array<[number, number]> = [
  [12, 3], [57, 2], [104, 4], [152, 2], [203, 3], [251, 2], [302, 4], [347, 2],
];

function conicRays(rays: Array<[number, number]>, ink: string): string {
  const stops = rays.map(([at, w]) => `transparent ${at}deg, ${ink} ${at}deg ${at + w}deg, transparent ${at + w}deg`);
  return `conic-gradient(from 0deg, ${stops.join(', ')}, transparent 360deg)`;
}

export function QuickResultsRays({ color, spinning }: { color: string; spinning: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="quick-results-rays"
      data-spinning={spinning ? 'true' : 'false'}
      className="pointer-events-none absolute left-1/2 top-1/2 h-[1200px] w-[1200px] -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,black_6%,transparent_72%)]"
    >
      <div
        data-ray-layer
        className={`absolute inset-0 ${spinning ? 'animate-[qp-ray-spin_34s_linear_infinite]' : ''}`}
        style={{ background: conicRays(MAIN_RAYS, `${color}40`) }}
      />
      <div
        data-ray-layer
        className={`absolute inset-0 ${spinning ? 'animate-[qp-ray-spin-rev_51s_linear_infinite]' : ''}`}
        style={{ background: conicRays(FINE_RAYS, '#ffffff1f') }}
      />
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(closest-side, ${color}59 0%, ${color}1a 18%, transparent 34%)` }}
      />
    </div>
  );
}

export function BurstLines({ enabled, delayMs = 380 }: { enabled: boolean; delayMs?: number }) {
  if (!enabled) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      {BURST_ANGLES.map((a) => (
        <span
          key={a}
          className="absolute -left-[3px] -top-[10px] h-5 w-1.5 rounded-full bg-neo-yellow animate-[qp-burst_0.7s_cubic-bezier(0.2,0.7,0.3,1)_both]"
          style={{ ...vars({ '--a': `${a}deg` }), animationDelay: `${delayMs}ms` }}
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
