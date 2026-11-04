'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';
import { NEO_HEX } from '@/components/education/economy/neoHex';
import { prefersStaticFullscreenOverlay } from '@/lib/native/webViewLayerFlash';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';

/**
 * The burst behind an opening chest: a light fan, a coin fountain and a pop of
 * confetti. Every piece is laid out while the chest is still closed and starts
 * as scale(0); opening only starts Web Animations on transforms, which run on
 * the compositor. Nothing mounts, measures or repaints on the open frame.
 */

export interface ChestBurstProps {
  playing: boolean;
  coinSrc: string;
  /** Parent's reduced-motion flag; OR-ed with useEduReducedMotion. */
  reduced?: boolean;
}

const COINS = 12;
const BITS = 18;
const BIT_COLORS = [NEO_HEX.lime, NEO_HEX.pink, NEO_HEX.cyan, NEO_HEX.yellow, NEO_HEX.orange];
const RAY_SPOKES = 12;

const RAYS_BG = (() => {
  const step = 360 / (RAY_SPOKES * 2);
  // Light, not paint: the spokes are ~45% yellow so the chest stays the brightest thing on screen.
  const stops = Array.from({ length: RAY_SPOKES * 2 }, (_, i) => `${i % 2 ? 'transparent' : `${NEO_HEX.yellow}73`} ${(i * step).toFixed(2)}deg ${((i + 1) * step).toFixed(2)}deg`);
  return `conic-gradient(from 0deg, ${stops.join(', ')})`;
})();
const RAYS_MASK = 'radial-gradient(circle, transparent 6%, black 22%, transparent 58%)';

/** Index-seeded arcs: no RNG, so a re-render never re-scatters them. */
function coinFrames(i: number): { frames: Keyframe[]; opts: KeyframeAnimationOptions } {
  const side = i % 2 ? 1 : -1;
  const lane = (Math.floor(i / 2) + 0.5) / (COINS / 2);
  const x = side * lane * 46 * (0.7 + ((i * 31) % 30) / 100);
  const rise = -(22 + ((i * 23) % 22));
  const spin = side * (220 + ((i * 41) % 200));
  const at = (fx: number, fy: number, r: number, s: number) => `translate(${(x * fx).toFixed(1)}vmin, ${fy.toFixed(1)}vmin) rotate(${Math.round(r)}deg) scale(${s})`;
  return {
    frames: [
      { transform: at(0, 0, 0, 0.3), offset: 0 },
      { transform: at(0.55, rise, spin * 0.35, 1), offset: 0.32 },
      { transform: at(0.78, rise * 0.55, spin * 0.6, 1), offset: 0.55 },
      { transform: at(1, 48, spin, 0), offset: 1 },
    ],
    opts: { duration: 1000 + ((i * 7) % 25) * 10, delay: ((i * 11) % 20) * 10, easing: 'ease-out', fill: 'both' },
  };
}

function bitFrames(i: number): { frames: Keyframe[]; opts: KeyframeAnimationOptions } {
  const angle = (i / BITS) * Math.PI * 2 + (i % 3) * 0.2;
  const reach = 26 + ((i * 17) % 16);
  const dx = Math.cos(angle) * reach;
  const dy = Math.sin(angle) * reach * 0.7 - 8;
  const turn = (i % 2 ? 1 : -1) * (300 + ((i * 29) % 240));
  return {
    frames: [
      { transform: 'translate(0, 0) rotate(0deg) scale(0)', offset: 0 },
      { transform: `translate(${dx.toFixed(1)}vmin, ${dy.toFixed(1)}vmin) rotate(${turn / 2}deg) scale(1)`, offset: 0.3 },
      { transform: `translate(${(dx * 1.08).toFixed(1)}vmin, ${(dy + 14).toFixed(1)}vmin) rotate(${turn * 0.75}deg) scale(1)`, offset: 0.7 },
      { transform: `translate(${(dx * 1.15).toFixed(1)}vmin, ${(dy + 30).toFixed(1)}vmin) rotate(${turn}deg) scale(0)`, offset: 1 },
    ],
    opts: { duration: 1300 + ((i * 13) % 20) * 10, delay: 40 + ((i * 7) % 6) * 10, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' },
  };
}

const HIDDEN = 'scale(0)';

export const ChestBurst = memo(function ChestBurst({ playing, coinSrc, reduced = false }: ChestBurstProps) {
  const still = useEduReducedMotion() || reduced;
  // Phones and the native app skip the confetti bits, as BoundedConfettiBurst does (mobile-web layer flash).
  const [confetti] = useState(() => !prefersStaticFullscreenOverlay());
  const fan = useRef<HTMLDivElement>(null);
  const spin = useRef<HTMLDivElement>(null);
  const coins = useRef<Array<HTMLImageElement | null>>([]);
  const bits = useRef<Array<HTMLSpanElement | null>>([]);

  // Decoded while the chest is closed: a first decode inside the burst would hold its first frames.
  useLayoutEffect(() => {
    if (still) return;
    void coins.current[0]?.decode?.().catch(() => undefined);
  }, [still]);

  useLayoutEffect(() => {
    if (!playing || still) return;
    const run: Animation[] = [];
    const play = (el: Element | null, frames: Keyframe[], opts: KeyframeAnimationOptions) => {
      if (el && typeof (el as HTMLElement).animate === 'function') run.push((el as HTMLElement).animate(frames, opts));
    };
    play(fan.current, [{ transform: 'scale(0.4)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    play(spin.current, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 26000, iterations: Infinity });
    coins.current.forEach((el, i) => { const c = coinFrames(i); play(el, c.frames, c.opts); });
    bits.current.forEach((el, i) => { const b = bitFrames(i); play(el, b.frames, b.opts); });
    return () => run.forEach((a) => a.cancel());
  }, [playing, still]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={fan}
        data-testid="chest-burst-rays"
        className="absolute left-1/2 top-[42%] h-[120vmin] w-[120vmin]"
        style={{ marginLeft: '-60vmin', marginTop: '-60vmin', transform: playing && still ? 'none' : HIDDEN, willChange: 'transform' }}
      >
        <div
          ref={spin}
          className="h-full w-full"
          style={{ background: RAYS_BG, WebkitMaskImage: RAYS_MASK, maskImage: RAYS_MASK }}
        />
      </div>
      {!still && Array.from({ length: COINS }, (_, i) => {
        const size = 22 + ((i * 19) % 14);
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`c${i}`}
            ref={(el) => { coins.current[i] = el; }}
            data-testid={`chest-burst-coin-${i}`}
            src={coinSrc}
            alt=""
            decoding="async"
            className="absolute left-1/2 top-[44%]"
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, transform: HIDDEN, willChange: 'transform' }}
          />
        );
      })}
      {!still && confetti && Array.from({ length: BITS }, (_, i) => (
        <span
          key={`b${i}`}
          ref={(el) => { bits.current[i] = el; }}
          data-testid={`chest-burst-bit-${i}`}
          className="absolute left-1/2 top-[42%] h-4 w-2.5 rounded-[3px] border-2 border-neo-black"
          style={{ background: BIT_COLORS[i % BIT_COLORS.length], transform: HIDDEN, willChange: 'transform' }}
        />
      ))}
    </div>
  );
});
