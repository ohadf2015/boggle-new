'use client';

import React, { useEffect, useRef } from 'react';
import { CoinArt } from '@/components/ui/CoinArt';
import { jackpotStampAt, type Point, type Rect } from './coinFlightPath';

export const JACKPOT_MS = 1050;

const GOLD = '#FFC53D';
const INK = '#0b1530';
const SPARKS = 8;

interface CoinJackpotProps {
  source: Point;
  avoid: Rect[];
  label: string;
  /** "burst" sits under the coins at the word; "stamp" sits over them, clear of the praise stamp. */
  part: 'burst' | 'stamp';
}

const stampBox = (vw: number) => (vw >= 1200 ? { w: 172, h: 66 } : { w: 132, h: 54 });

function animateAll(root: HTMLElement | null, part: 'burst' | 'stamp'): Animation[] {
  if (!root || typeof root.animate !== 'function') return [];
  const out: Animation[] = [];
  const run = (el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
    if (el instanceof HTMLElement) out.push(el.animate(frames, { fill: 'both', ...opts }));
  };
  if (part === 'burst') {
    run(root.querySelector('[data-jp-ring]'), [
      { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 1 },
      { transform: 'translate(-50%, -50%) scale(3.4)', opacity: 0 },
    ], { duration: 560, easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)' });
    root.querySelectorAll('[data-jp-spark]').forEach((el, k) => {
      const a = (k / SPARKS) * Math.PI * 2 + 0.3;
      const r = 96 + (k % 2) * 34;
      run(el, [
        { transform: 'translate(-50%, -50%) rotate(45deg) scale(0.4)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) rotate(225deg) scale(1)`, opacity: 1, offset: 0.7 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * r * 1.1}px), calc(-50% + ${Math.sin(a) * r * 1.1}px)) rotate(270deg) scale(0.2)`, opacity: 0 },
      ], { duration: 640, easing: 'cubic-bezier(0.15, 0.8, 0.3, 1)' });
    });
    return out;
  }
  run(root.querySelector('[data-jp-rays]'), [
    { transform: 'rotate(0deg) scale(0.3)', opacity: 0 },
    { transform: 'rotate(14deg) scale(1.12)', opacity: 1, offset: 0.2 },
    { transform: 'rotate(34deg) scale(1)', opacity: 0.9, offset: 0.75 },
    { transform: 'rotate(44deg) scale(1.05)', opacity: 0 },
  ], { duration: JACKPOT_MS, easing: 'ease-out' });
  run(root.querySelector('[data-jp-stamp]'), [
    { transform: 'translate(-50%, -50%) scale(0.2) rotate(-10deg)', opacity: 1 },
    { transform: 'translate(-50%, -50%) scale(1.3) rotate(5deg)', opacity: 1, offset: 0.14 },
    { transform: 'translate(-50%, -50%) scale(0.94) rotate(-2deg)', opacity: 1, offset: 0.26 },
    { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.36 },
    { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.8 },
    { transform: 'translate(-50%, calc(-50% - 18px)) scale(0.85) rotate(0deg)', opacity: 0 },
  ], { duration: JACKPOT_MS, easing: 'ease-out' });
  return out;
}

/** The big-word payoff: a gold shockwave and sparks at the word, then a "+N" stamp with rays beside it. */
export function CoinJackpot({ source, avoid, label, part }: CoinJackpotProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 844 : window.innerHeight;
  const box = stampBox(vw);
  const at = part === 'stamp' ? jackpotStampAt(source, avoid, { w: vw, h: vh }, { w: box.w, h: box.h + 30 }) : source;

  useEffect(() => {
    const animations = animateAll(rootRef.current, part);
    return () => animations.forEach((a) => a.cancel());
  }, [part]);

  if (part === 'burst') {
    return (
      <div ref={rootRef} className="absolute" style={{ left: at.x, top: at.y }}>
        <span
          data-jp-ring
          className="absolute left-0 top-0 rounded-full"
          style={{ width: 70, height: 70, border: `5px solid ${GOLD}`, boxShadow: `0 0 22px ${GOLD}`, transform: 'translate(-50%, -50%) scale(0)' }}
        />
        {Array.from({ length: SPARKS }, (_, k) => (
          <span
            key={k}
            data-jp-spark
            className="absolute left-0 top-0"
            style={{ width: 11, height: 11, background: k % 2 ? '#FFF6D5' : GOLD, border: `2px solid ${INK}`, transform: 'translate(-50%, -50%) scale(0)' }}
          />
        ))}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="absolute" style={{ left: at.x, top: at.y }} data-testid="coin-jackpot">
      <span className="absolute left-0 top-0" style={{ transform: `translate(-50%, -50%) scaleY(0.46)` }}>
        <span
          data-jp-rays
          className="block rounded-full"
          style={{
            width: box.w * 2,
            height: box.w * 2,
            opacity: 0,
            background: `repeating-conic-gradient(${GOLD}cc 0deg 9deg, transparent 9deg 22deg)`,
            WebkitMaskImage: 'radial-gradient(circle, #000 18%, transparent 68%)',
            maskImage: 'radial-gradient(circle, #000 18%, transparent 68%)',
          }}
        />
      </span>
      <span
        data-jp-stamp
        className="absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-xl font-neo-display font-black tabular-nums"
        dir="ltr"
        style={{
          height: box.h,
          paddingInline: box.h * 0.22,
          fontSize: box.h * 0.6,
          color: INK,
          background: GOLD,
          border: `3px solid ${INK}`,
          boxShadow: `4px 4px 0 0 ${INK}, 0 0 26px ${GOLD}`,
          transform: 'translate(-50%, -50%) scale(0)',
        }}
      >
        <CoinArt size={Math.round(box.h * 0.66)} />
        <span>{label}</span>
      </span>
    </div>
  );
}

export default CoinJackpot;
