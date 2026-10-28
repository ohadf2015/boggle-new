import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { pressClasses } from '@/components/education/motion/pressClasses';
import { entranceOffset, pickRevealSignature, REVEAL_SIGNATURES, type RevealSignature } from '@/lib/education/motion/revealSignature';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** A filter-only press cue: a translate or scale here would override or stack on the lip's sink in cn(PRIMARY_BUTTON, PRESS). */
export const PRESS =
  'active:brightness-90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:cursor-not-allowed disabled:opacity-60';

export const PRIMARY_BUTTON = `inline-flex items-center justify-center gap-2 rounded-neo border-4 border-neo-black bg-neo-lime font-neo-display font-black uppercase tracking-tight text-neo-black ${pressClasses(4)}`;

export const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center gap-2 rounded-neo border-[3px] border-neo-cream bg-neo-navy-elevated px-4 py-2 font-neo-display text-sm font-black uppercase tracking-wide text-neo-cream hover:bg-neo-navy-light ${pressClasses(2)}`;

/** Keyframes as a literal string: transform only, never from scale(0), never an opacity tween (Class 5). */
export const LIVE_KEYFRAMES =
  '@keyframes edu-live-pop{0%{transform:scale(0.85) translateY(6px) rotate(var(--tilt,0deg))}60%{transform:scale(1.04) rotate(calc(var(--tilt,0deg) * -0.4))}100%{transform:scale(1)}}' +
  '@keyframes edu-live-enter{0%{transform:perspective(900px) translate(var(--ex,0px),var(--ey,14px)) rotate(var(--er,0deg)) rotateX(var(--erx,0deg)) scale(var(--es,1))}100%{transform:none}}' +
  '@keyframes edu-live-drop{0%{transform:translateY(-38%) rotate(var(--tilt,0deg)) scale(1.08)}70%{transform:translateY(4%)}100%{transform:none}}' +
  '@keyframes edu-live-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
  '@keyframes edu-live-tick{0%{transform:scale(1.35)}100%{transform:scale(1)}}' +
  '@keyframes edu-live-unlock{0%{transform:scale(0.96)}55%{transform:scale(1.03)}100%{transform:scale(1)}}' +
  '@keyframes edu-live-beckon{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}';

/** Panels land on mount with the visit's dealt entrance (see useEnterStyle); one-time, so the stagger is earned. */
export const RISE = 'motion-safe:animate-[edu-live-enter_var(--ed,320ms)_var(--ee,cubic-bezier(0.23,1,0.32,1))_backwards]';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Deals one entrance per mount, after hydration and before paint, so the markup stays stable and re-renders never re-roll it. */
export function useEnterStyle(slots = 8): (index: number) => CSSProperties {
  const [dealt, setDealt] = useState(() => deal(REVEAL_SIGNATURES[0], slots, () => 0.5));
  useIsoLayoutEffect(() => setDealt(deal(pickRevealSignature(), slots)), [slots]);
  return (index) => dealt[Math.min(index, dealt.length - 1)];
}

function deal(sig: RevealSignature, slots: number, rand: () => number = Math.random): CSSProperties[] {
  return Array.from({ length: slots }, (_, index) => {
    const o = entranceOffset(sig, index, rand);
    return {
      '--ex': `${o.x.toFixed(1)}px`,
      '--ey': `${o.y.toFixed(1)}px`,
      '--er': `${o.rotate.toFixed(2)}deg`,
      '--erx': `${o.rotateX}deg`,
      '--es': String(o.scale),
      '--ed': `${Math.round(sig.duration * 1000)}ms`,
      '--ee': sig.css,
      animationDelay: `${Math.round(index * sig.stagger * 1000)}ms`,
    } as CSSProperties;
  });
}

/** A fresh landing order for n items each mount (index -> slot); identity until hydrated. */
export function useShuffledOrder(n: number): number[] {
  const [order, setOrder] = useState(() => Array.from({ length: n }, (_, i) => i));
  useIsoLayoutEffect(() => {
    const next = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
  }, [n]);
  return order;
}

/** A stable lean per name, -5..5deg, so every arrival pops a little differently. */
export function tiltOf(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return `${(Math.abs(h) % 11) - 5}deg`;
}
