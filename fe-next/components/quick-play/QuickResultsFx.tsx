'use client';

import type React from 'react';

// Calm celebration layers for the quick-play results hero. Everything here is
// small or rotating; nothing fades a full-screen layer in (mobile flash).

const SPARK_SLOTS = [
  { left: '12%', top: '18%', delay: '0s' },
  { left: '82%', top: '14%', delay: '0.9s' },
  { left: '70%', top: '70%', delay: '1.7s' },
  { left: '20%', top: '76%', delay: '2.4s' },
  { left: '50%', top: '8%', delay: '3.1s' },
  { left: '92%', top: '48%', delay: '3.8s' },
];

const COIN_SLOTS = [0, 1, 2, 3, 4, 5, 6, 7];

export function QuickResultsRays({ color, enabled }: { color: string; enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div
      aria-hidden="true"
      data-testid="quick-results-rays"
      className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[260%] w-[260%] -translate-x-1/2 -translate-y-1/2 animate-[qp-ray-spin_28s_linear_infinite] opacity-60 [mask-image:radial-gradient(circle,black_0%,transparent_55%)]"
      style={{
        background: `repeating-conic-gradient(from 0deg, ${color}33 0deg 9deg, transparent 9deg 24deg)`,
      }}
    />
  );
}

export function QuickResultsSparkles({ count, enabled }: { count: number; enabled: boolean }) {
  const n = Math.min(Math.max(0, Math.floor(count)), SPARK_SLOTS.length);
  if (!enabled || n === 0) return null;
  return (
    <div aria-hidden="true" data-testid="quick-results-sparkles" className="pointer-events-none absolute inset-0">
      {SPARK_SLOTS.slice(0, n).map((slot, i) => (
        <span
          key={i}
          data-spark
          className="absolute h-3 w-3 animate-[qp-spark_3.2s_ease-in-out_infinite] text-neo-yellow"
          style={{ left: slot.left, top: slot.top, animationDelay: slot.delay }}
        >
          <svg viewBox="0 0 24 24" className="h-full w-full fill-current">
            <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}

export function CoinFlight({ count, enabled }: { count: number; enabled: boolean }) {
  const n = Math.min(Math.max(0, Math.floor(count)), COIN_SLOTS.length);
  if (!enabled || n === 0) return null;
  return (
    <div aria-hidden="true" data-testid="quick-coin-flight" className="pointer-events-none absolute inset-0">
      {COIN_SLOTS.slice(0, n).map((i) => (
        <span
          key={i}
          data-coin
          className="absolute left-1/2 top-0 h-3.5 w-3.5 rounded-full border-2 border-black bg-neo-yellow animate-[qp-coin-fly_1.1s_cubic-bezier(0.3,0,0.2,1)_both]"
          style={
            {
              animationDelay: `${1.1 + i * 0.09}s`,
              '--fx': `${(i - 3.5) * 7}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
