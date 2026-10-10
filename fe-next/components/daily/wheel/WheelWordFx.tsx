'use client';

import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DISC, letterPoint } from '@/lib/wordWheel/discGeometry';
import type { WheelWordFxEvent } from './useWheelWordFx';

interface DiscFxProps {
  fx: WheelWordFxEvent | null;
  outerCount: number;
  t: (key: string, params?: Record<string, string | number>) => string;
  reducedMotion: boolean;
}

/** Shockwave, letter bursts, praise stamp and the rising score, all on the disc. */
export const DiscFx: React.FC<DiscFxProps> = ({ fx, outerCount, t, reducedMotion }) => {
  if (!fx) return null;
  const good = fx.kind === 'good';
  return (
    <div key={fx.id} data-testid="wheel-disc-fx" data-kind={fx.kind} aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
      {!reducedMotion && (
        <>
          <m.div
            className={cn('absolute inset-[4%] rounded-full border-[1.6cqw]', good ? 'border-neo-lime' : 'border-neo-red')}
            initial={{ scale: good ? 0.5 : 1, opacity: 1 }}
            animate={{ scale: good ? 1.22 : 1.06, opacity: 0 }}
            transition={{ duration: good ? 0.6 : 0.5, ease: 'easeOut' }}
            style={{ boxShadow: good ? '0 0 24px rgba(191,255,0,0.7)' : '0 0 24px rgba(255,51,102,0.7)' }}
          />
          {good && (
            <m.div
              className="absolute inset-[4%] rounded-full border-[0.9cqw] border-neo-cyan"
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 1.32, opacity: 0 }}
              transition={{ duration: 0.75, delay: 0.09, ease: 'easeOut' }}
            />
          )}
        </>
      )}
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
      {good && fx.praise && (
        <div className="absolute inset-x-0 top-[1%] flex justify-center">
          <m.span
            data-testid="wheel-praise"
            className="font-neo-display font-black uppercase leading-none text-neo-lime whitespace-nowrap text-[11cqw]"
            style={{
              WebkitTextStroke: '0.9cqw #0b1530',
              paintOrder: 'stroke fill',
              textShadow: '0.9cqw 1cqw 0 #0b1530, 0 0 18px rgba(191,255,0,0.55)',
            }}
            initial={{ scale: 2.4, opacity: 0, rotate: -14 }}
            animate={reducedMotion
              ? { scale: 1, opacity: [1, 1, 0], rotate: -6 }
              : {
                  scale: [2.4, 0.88, 1.08, 1, 1, 0.92],
                  opacity: [0, 1, 1, 1, 1, 0],
                  rotate: [-14, -4, -7, -6, -6, -6],
                  y: [0, 0, 0, 0, 0, -16],
                }}
            transition={{ duration: 1.25, times: [0, 0.1, 0.16, 0.22, 0.8, 1], ease: 'easeOut' }}
          >
            {t(`wordWheel.praise.${fx.praise}`)}
          </m.span>
        </div>
      )}
      {good && (
        <m.span
          data-testid="wheel-points-fly"
          className="absolute left-1/2 -translate-x-1/2 px-[3cqw] py-[1cqw] rounded-full border-[0.8cqw] border-neo-black bg-neo-yellow text-neo-black font-neo-display font-black text-[7.5cqw] leading-none shadow-[3px_3px_0_#000] whitespace-nowrap"
          style={{ zIndex: 6 }}
          initial={{ top: '43%', scale: 0.3, opacity: 0 }}
          animate={reducedMotion
            ? { top: '30%', scale: 1, opacity: [1, 1, 0] }
            : { top: ['43%', '35%', '27%', '19%'], scale: [0.3, 1.3, 1, 0.9], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.15, times: [0, 0.14, 0.7, 1], ease: 'easeOut' }}
        >
          +{fx.points}
        </m.span>
      )}
    </div>
  );
};

interface LaunchFxProps {
  fx: WheelWordFxEvent | null;
  reducedMotion: boolean;
}

/** The spelled word lifts off the tray: up into the score when it counts, a shake and a drop when it does not. */
export const LaunchFx: React.FC<LaunchFxProps> = ({ fx, reducedMotion }) => {
  if (!fx?.launch || fx.launch.from.length === 0) return null;
  const { from, to } = fx.launch;
  const good = fx.kind === 'good';
  return (
    <div key={fx.id} data-testid="wheel-launch-fx" data-kind={fx.kind} aria-hidden className="absolute inset-0 pointer-events-none z-40 overflow-visible">
      {from.map((r, i) => {
        const dx = to.x - (r.x + r.w / 2);
        const dy = to.y - (r.y + r.h / 2);
        const isHub = fx.indices[i] === -1;
        return (
          <m.span
            key={`${fx.id}-${i}`}
            data-testid="wheel-launch-letter"
            className={cn(
              'absolute flex items-center justify-center rounded-neo border-3 border-neo-black font-neo-display font-black text-base sm:text-lg md:text-xl uppercase',
              good
                ? isHub ? 'bg-neo-lime text-neo-black' : 'bg-neo-white text-neo-navy'
                : 'bg-neo-red text-neo-white',
            )}
            style={{ left: r.x, top: r.y, width: r.w, height: r.h, boxShadow: good ? '3px 3px 0 #000, 0 0 16px rgba(191,255,0,0.6)' : '3px 3px 0 #000' }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={reducedMotion
              ? { opacity: [1, 0] }
              : good
                ? {
                    x: [0, 0, dx * 0.35, dx],
                    y: [0, -18, dy * 0.4 - 30, dy],
                    scale: [1, 1.32, 0.95, 0.3],
                    rotate: [0, (i % 2 ? 6 : -6), (i % 2 ? -10 : 10), 0],
                    opacity: [1, 1, 1, 0],
                  }
                : {
                    x: [0, -7, 7, -5, 5, -2, 0, 0],
                    y: [0, 0, 0, 0, 0, 0, 0, 30],
                    rotate: [0, -4, 4, -3, 3, 0, 0, 12],
                    opacity: [1, 1, 1, 1, 1, 1, 1, 0],
                  }}
            transition={good
              ? { duration: 0.85, delay: i * 0.04, times: [0, 0.16, 0.5, 1], ease: 'easeIn' }
              : { duration: 0.8, ease: 'easeOut' }}
          >
            {fx.letters[i]}
          </m.span>
        );
      })}
    </div>
  );
};
