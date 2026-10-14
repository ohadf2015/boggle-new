'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DISC, letterPoint } from '@/lib/wordWheel/discGeometry';
import type { WheelWordFxEvent } from './useWheelWordFx';

interface DiscFxProps {
  fx: WheelWordFxEvent | null;
  reducedMotion: boolean;
}

const SPARK_COLORS = ['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-yellow', 'bg-neo-white'];

const Sparks: React.FC<{ count: number; reach: number }> = ({ count, reach }) => (
  <>
    {Array.from({ length: count }, (_, k) => {
      const a = ((k * 360) / count + (k % 2 ? 9 : -9)) * (Math.PI / 180);
      const d = reach * (k % 3 === 0 ? 1 : k % 3 === 1 ? 0.82 : 0.66);
      return (
        <m.span
          key={k}
          data-testid="wheel-spark"
          className={cn('absolute w-[3.2%] h-[3.2%] -ml-[1.6%] -mt-[1.6%] border-[0.4cqw] border-neo-black', SPARK_COLORS[k % SPARK_COLORS.length], k % 2 ? 'rounded-full' : 'rounded-[0.6cqw]')}
          initial={{ left: '50%', top: '50%', scale: 0.4, opacity: 1 }}
          animate={{
            left: ['50%', `${50 + Math.sin(a) * d}%`, `${50 + Math.sin(a) * d * 1.08}%`],
            top: ['50%', `${50 - Math.cos(a) * d}%`, `${50 - Math.cos(a) * d * 1.08 + 6}%`],
            scale: [0.4, 1.25, 0.5],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 0.95, times: [0, 0.4, 1], ease: 'easeOut', delay: 0.02 }}
        />
      );
    })}
  </>
);

/** Each spelled letter bursts where it sits. */
export const LetterBursts: React.FC<{ fx: WheelWordFxEvent | null; outerCount: number }> = ({ fx, outerCount }) => {
  if (!fx) return null;
  const good = fx.kind === 'good';
  return (
    <div key={fx.id} aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }}>
      {fx.indices.map((idx, order) => {
        const p = letterPoint(idx, outerCount);
        const size = idx === -1 ? DISC.center : DISC.outer;
        return (
          <m.span
            key={`${fx.id}-${idx}`}
            data-testid="wheel-letter-burst"
            className={cn(
              'absolute rounded-full border-[0.8cqw]',
              good ? 'bg-neo-lime/70 border-neo-white' : 'bg-neo-red/60 border-neo-red',
            )}
            style={{ width: `${size}%`, height: `${size}%`, left: `${p.x - size / 2}%`, top: `${p.y - size / 2}%` }}
            initial={{ scale: 1, opacity: 0.95 }}
            animate={{ scale: good ? 2 : 1.45, opacity: 0 }}
            transition={{ duration: good ? 0.5 : 0.4, delay: order * 0.035, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
};

/** Shockwave and sparks on the disc; the verdict text belongs to the word line. */
export const DiscFx: React.FC<DiscFxProps> = ({ fx, reducedMotion }) => {
  if (!fx) return null;
  const good = fx.kind === 'good';
  return (
    <div key={fx.id} data-testid="wheel-disc-fx" data-kind={fx.kind} aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {!reducedMotion && (
        <m.div
          className={cn('absolute inset-[4%] rounded-full border-[1.6cqw]', good ? 'border-neo-lime' : 'border-neo-red')}
          initial={{ scale: good ? 0.5 : 1, opacity: 1 }}
          animate={{ scale: good ? 1.22 : 1.06, opacity: 0 }}
          transition={{ duration: good ? 0.6 : 0.5, ease: 'easeOut' }}
        />
      )}
      {good && !reducedMotion && (
        <m.div
          className="absolute inset-[4%] rounded-full border-[0.9cqw] border-neo-cyan"
          initial={{ scale: 0.4, opacity: 0.9 }}
          animate={{ scale: 1.32, opacity: 0 }}
          transition={{ duration: 0.75, delay: 0.09, ease: 'easeOut' }}
        />
      )}
      {good && !reducedMotion && <Sparks count={fx.coverage === 'none' ? 12 : 20} reach={fx.coverage === 'none' ? 40 : 52} />}
    </div>
  );
};
