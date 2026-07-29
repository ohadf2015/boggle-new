'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { pointerToTilt, shadowForTilt, type Rect } from '@/lib/showcase3d/tilt';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export interface Mode {
  side: 'left' | 'right';
  accent: string;
  tag: string;
  title: string;
  body: string;
  video: string;
  poster: string;
}

/**
 * Gameplay panel: a ScrollTrigger scrub rotates + lifts the OUTER wrapper into
 * place as it enters; the copy staggers in; the INNER frame keeps a live pointer
 * micro-tilt (tested tilt.ts). Clip plays only while in view (off-screen pause).
 */
export default function GameplayPanel({ mode, isRTL }: { mode: Mode; isRTL: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const shadow = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const sign = isRTL ? -1 : 1;
  const dir = mode.side === 'left' ? -1 : 1;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ reduce: '(prefers-reduced-motion: reduce)', fine: '(pointer: fine)' }, (ctx) => {
        const reduce = !!ctx.conditions?.reduce;
        const fine = !!ctx.conditions?.fine;

        if (!reduce) {
          if (wrap.current) {
            gsap.fromTo(
              wrap.current,
              { rotationY: dir * sign * 26, y: 70, autoAlpha: 0, transformPerspective: 1100, transformOrigin: 'center' },
              { rotationY: 0, y: 0, autoAlpha: 1, ease: 'power2.out', scrollTrigger: { trigger: root.current, start: 'top 88%', end: 'top 42%', scrub: 0.7 } },
            );
          }
          gsap.from('.s3-pcopy', {
            y: 24,
            autoAlpha: 0,
            stagger: 0.1,
            duration: 0.6,
            ease: 'power3.out',
            scrollTrigger: { trigger: root.current, start: 'top 80%' },
          });
        }

        if (!fine || reduce || !frame.current) return;
        const setRX = gsap.quickTo(frame.current, 'rotationX', { duration: 0.5, ease: 'power3' });
        const setRY = gsap.quickTo(frame.current, 'rotationY', { duration: 0.5, ease: 'power3' });
        const setSX = gsap.quickTo(shadow.current, 'x', { duration: 0.5, ease: 'power3' });
        const setSY = gsap.quickTo(shadow.current, 'y', { duration: 0.5, ease: 'power3' });
        const onMove = (e: PointerEvent) => {
          const r = frame.current!.getBoundingClientRect();
          const rect: Rect = { left: r.left, top: r.top, width: r.width, height: r.height };
          const { rotateX, rotateY } = pointerToTilt(e.clientX, e.clientY, rect, 7);
          const { x: sx, y: sy } = shadowForTilt(rotateX, rotateY, sign * 10, 0.8);
          setRX(rotateX);
          setRY(rotateY);
          setSX(sx);
          setSY(sy);
        };
        const onLeave = () => {
          setRX(0);
          setRY(0);
          setSX(sign * 10);
          setSY(10);
        };
        const el = frame.current;
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        return () => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        };
      });
    },
    { scope: root },
  );

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !reduce) vid.current?.play().catch(() => {});
        else vid.current?.pause();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={root} className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${mode.side === 'right' ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <div className="max-w-md">
        <span className={`s3-pcopy inline-block rounded-neo border-neo-thick border-black px-3 py-1 font-neo-display text-sm font-bold text-black shadow-hard ${mode.accent}`}>
          {mode.tag}
        </span>
        <h3 className="s3-pcopy mt-4 font-neo-display text-3xl font-bold leading-tight text-neo-white sm:text-4xl">{mode.title}</h3>
        <p className="s3-pcopy mt-3 max-w-[42ch] font-neo-body text-lg text-neo-white">{mode.body}</p>
      </div>

      <div className="grid place-items-center" style={{ perspective: 1100 }}>
        <div ref={wrap} className="relative inline-grid">
          <div ref={shadow} aria-hidden className="[grid-area:1/1] rounded-neo-xl bg-[rgb(10,10,18)]" style={{ transform: `translate(${sign * 10}px, 10px)` }} />
          <div ref={frame} className="relative z-10 [grid-area:1/1] overflow-hidden rounded-neo-xl border-neo-thick border-black bg-neo-navy-light p-2">
            <video ref={vid} className="block w-full rounded-neo border-neo border-black object-cover" src={mode.video} poster={mode.poster} muted loop playsInline preload="metadata" />
          </div>
        </div>
      </div>
    </div>
  );
}
