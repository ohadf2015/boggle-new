import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

const TONES = ['bg-neo-lime', 'bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-pink'];
const SPARKS = Array.from({ length: 10 }, (_, i) => ({
  a: `${i * 36 + (i % 2) * 14}deg`,
  d: `${52 + (i % 3) * 14}cqi`,
  tone: TONES[i % TONES.length],
}));

const CSS = `
.hero-spark{display:none}
@media (prefers-reduced-motion: no-preference){
.hero-spark{display:block;animation:hero-spark .75s cubic-bezier(.15,.75,.3,1) both;animation-delay:calc(var(--i) * 18ms)}
}
@keyframes hero-spark{0%{transform:rotate(var(--a)) translateY(0) scale(.4)}60%{transform:rotate(var(--a)) translateY(calc(var(--d) * -1)) scale(1.15)}100%{transform:rotate(var(--a)) translateY(calc(var(--d) * -1.15)) scale(0)}}
`;

/** Confetti chips thrown off the board's centre when the demo word lands. */
export function HeroSparks() {
  return (
    <>
      <style>{CSS}</style>
      {SPARKS.map((sp, i) => (
        <span
          key={i}
          data-hero-spark
          aria-hidden="true"
          style={{ '--a': sp.a, '--d': sp.d, '--i': i } as CSSProperties}
          className={cn(
            'hero-spark pointer-events-none absolute left-1/2 top-1/2 z-30 -ml-2 -mt-2 h-4 w-4 rounded-[3px] border-2 border-neo-black',
            sp.tone
          )}
        />
      ))}
    </>
  );
}
