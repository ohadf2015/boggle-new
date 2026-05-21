'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';

interface ShiritoriHeroProps {
  title: string;
  tagline: string;
  /** Kana chain shown floating around the mascot, e.g. ['し','り','と','り']. */
  kana: string[];
}

const CHIP_COLORS = ['bg-neo-lime', 'bg-neo-pink', 'bg-neo-cyan', 'bg-neo-purple'];

/**
 * Landing hero for the Shiritori mode. GSAP entrance (mascot pop + kana stagger)
 * plus a gentle idle float, gated behind prefers-reduced-motion. Uses raw
 * gsap.context (no @gsap/react in deps). The mascot art is the brand mode image.
 */
export default function ShiritoriHero({ title, tagline, kana }: ShiritoriHeroProps) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // respect reduced motion — no animation
    }
    const ctx = gsap.context(() => {
      gsap.from('.shiritori-mascot', { scale: 0.6, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' });
      gsap.from('.shiritori-kana', { y: 24, opacity: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out', delay: 0.25 });
      gsap.from('.shiritori-copy', { y: 16, opacity: 0, duration: 0.5, delay: 0.4, ease: 'power2.out' });
      gsap.to('.shiritori-mascot', { y: -10, duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="flex flex-col items-center text-center">
      <div className="relative">
        <Image
          src="/modes/shiritori.png"
          alt={title}
          width={260}
          height={260}
          priority
          className="shiritori-mascot drop-shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-hidden="true">
        {kana.map((k, i) => (
          <span
            key={`${k}-${i}`}
            className={`shiritori-kana inline-flex h-11 w-11 items-center justify-center rounded-neo border-neo-thick border-black text-2xl font-neo-display text-black shadow-hard ${CHIP_COLORS[i % CHIP_COLORS.length]}`}
          >
            {k}
          </span>
        ))}
      </div>
      <h1 className="shiritori-copy mt-6 font-neo-display text-3xl font-bold text-neo-cream sm:text-5xl">{title}</h1>
      <p className="shiritori-copy mt-3 max-w-xl font-neo-body text-base text-neo-cream/80 sm:text-lg">{tagline}</p>
    </div>
  );
}
