'use client';

import { useRef, type CSSProperties, type RefObject } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { pointerToTilt, shadowForTilt, type Rect } from '@/lib/showcase3d/tilt';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const REST = 6; // resting hard-shadow offset (px)

/**
 * Persistent play button: hidden over the hero, pops in once you scroll past it,
 * hides again while the page's own bottom CTA is on screen (no double button).
 * On fine pointers it tilts in 3D toward the cursor with a tracking hard shadow
 * (tested tilt.ts). Stays put as the scroll changes the screen behind it.
 */
export default function FloatingCTA({
  href,
  label,
  isRTL,
  hideBelow,
}: {
  href: string;
  label: string;
  isRTL: boolean;
  hideBelow?: RefObject<HTMLElement | null>;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLAnchorElement>(null);
  const sign = isRTL ? -1 : 1;

  useGSAP(
    () => {
      const el = wrap.current;
      if (!el) return;
      gsap.set(el, { autoAlpha: 0, y: 24, scale: 0.9 });

      let shown = false;
      const setVis = (v: boolean) => {
        if (v === shown) return;
        shown = v;
        gsap.to(el, { autoAlpha: v ? 1 : 0, y: v ? 0 : 24, scale: v ? 1 : 0.9, duration: 0.45, ease: 'back.out(1.5)' });
      };
      const st = ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: () => {
          const vh = window.innerHeight;
          const past = window.scrollY > vh * 0.8;
          const near = hideBelow?.current ? hideBelow.current.getBoundingClientRect().top < vh * 0.85 : false;
          setVis(past && !near);
        },
      });

      const mm = gsap.matchMedia();
      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const target = btn.current;
        if (!target) return;
        const setRX = gsap.quickTo(target, 'rotationX', { duration: 0.4, ease: 'power3' });
        const setRY = gsap.quickTo(target, 'rotationY', { duration: 0.4, ease: 'power3' });
        const setSX = gsap.quickTo(target, '--sx', { duration: 0.4, ease: 'power3' });
        const setSY = gsap.quickTo(target, '--sy', { duration: 0.4, ease: 'power3' });
        const onMove = (e: PointerEvent) => {
          const r = target.getBoundingClientRect();
          const rect: Rect = { left: r.left, top: r.top, width: r.width, height: r.height };
          const { rotateX, rotateY } = pointerToTilt(e.clientX, e.clientY, rect, 14);
          const { x: sx, y: sy } = shadowForTilt(rotateX, rotateY, sign * REST, 0.5);
          setRX(rotateX);
          setRY(rotateY);
          setSX(sx);
          setSY(sy);
        };
        const onLeave = () => {
          setRX(0);
          setRY(0);
          setSX(sign * REST);
          setSY(REST);
        };
        target.addEventListener('pointermove', onMove);
        target.addEventListener('pointerleave', onLeave);
        return () => {
          target.removeEventListener('pointermove', onMove);
          target.removeEventListener('pointerleave', onLeave);
        };
      });

      return () => st.kill();
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap} className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0" style={{ perspective: 500 }}>
      <Link
        ref={btn}
        href={href}
        style={{ '--sx': sign * REST, '--sy': REST, boxShadow: 'calc(var(--sx) * 1px) calc(var(--sy) * 1px) 0 rgb(10 10 18)' } as CSSProperties}
        className="block rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3.5 font-neo-display text-base font-bold text-black will-change-transform sm:text-lg"
      >
        {label}
      </Link>
    </div>
  );
}
