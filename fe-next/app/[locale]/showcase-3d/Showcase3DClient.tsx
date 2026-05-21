'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pointerToTilt, shadowForTilt, type Rect } from '@/lib/showcase3d/tilt';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// Evenly sample n frames (1-indexed jpgs) from a chapter dir that holds `total`.
const sampleFrames = (dir: string, total: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const idx = Math.round(1 + (i * (total - 1)) / (n - 1));
    return `${dir}/${String(idx).padStart(4, '0')}.jpg`;
  });

// Four gameplay chapters scrub one after another: board → igniting → versus → mascot win.
const CH1 = sampleFrames('/showcase3d/seq-board', 90, 78); // correct-mascot word board ("PLAY")
const CH2 = sampleFrames('/scroll/seq/ch2', 130, 78); // letters chaining / igniting
const CHVS = sampleFrames('/showcase3d/seq-vs', 80, 70); // real 1v3 versus footage
const WIN = sampleFrames('/showcase3d/seq', 110, 94); // correct-mascot world-of-words finale
const FRAMES = [...CH1, ...CH2, ...CHVS, ...WIN];
const TOTAL = FRAMES.length;

interface Showcase3DClientProps {
  locale: string;
}

interface Caption {
  badge?: string;
  title: string;
  body: string;
  window: [number, number]; // [enter, exit] as fractions of the scrub timeline (0..1)
}

interface Mode {
  side: 'left' | 'right';
  accent: string;
  tag: string;
  title: string;
  body: string;
  video: string;
  poster: string;
}

const MARQUEE = ['SPELL', 'CHAIN', 'COMBO', 'VERSUS', 'DAILY', 'STEAL THE WIN', '5 LANGUAGES'];

/**
 * Gameplay panel: a ScrollTrigger scrub rotates + lifts the OUTER wrapper into
 * place as it enters; the copy staggers in; the INNER frame keeps a live pointer
 * micro-tilt (tested tilt.ts). Clip plays only while in view (off-screen pause).
 */
function GameplayPanel({ mode, isRTL }: { mode: Mode; isRTL: boolean }) {
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
        <h3 className="s3-pcopy mt-4 font-neo-display text-3xl font-bold leading-tight text-neo-cream sm:text-4xl">{mode.title}</h3>
        <p className="s3-pcopy mt-3 max-w-[42ch] font-neo-body text-lg text-neo-cream/75">{mode.body}</p>
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

export default function Showcase3DClient({ locale }: Showcase3DClientProps) {
  const { t } = useLanguage();
  const isRTL = locale === 'he';
  const playHref = `/${locale}`;

  const section = useRef<HTMLElement>(null);
  const pinWrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modesRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);

  const captions: Caption[] = [
    { badge: t('showcase3d.heroBadge', 'A world of words'), title: t('showcase3d.cap0Title', 'Spot the word'), body: t('showcase3d.cap0Body', 'Drag across the board to spell. Letters everywhere — grab them.'), window: [0.0, 0.21] },
    { title: t('showcase3d.cap1Title', 'Chain them. Light them up.'), body: t('showcase3d.cap1Body', 'Every word ignites the board and pumps your combo meter.'), window: [0.27, 0.45] },
    { title: t('showcase3d.cap2Title', 'Go head-to-head'), body: t('showcase3d.cap2Body', 'Four cubes, one live board, zero mercy — steal words mid-round.'), window: [0.51, 0.68] },
    { title: t('showcase3d.cap3Title', 'Land the win, out loud.'), body: t('showcase3d.cap3Body', 'Outscore the room and the cube goes wild. Bragging mandatory.'), window: [0.74, 0.99] },
  ];

  const modes: Mode[] = [
    { side: 'left', accent: 'bg-neo-cyan', tag: t('showcase3d.mode1Tag', 'Solo · Daily'), title: t('showcase3d.mode1', 'One board. One shot.'), body: t('showcase3d.mode1Body', 'The same daily grid for everyone. Climb the global rank before midnight.'), video: '/videos/reddit-gameplay-demo.mp4', poster: '/showcase3d/poster-reddit-gameplay-demo.jpg' },
    { side: 'right', accent: 'bg-neo-pink', tag: t('showcase3d.mode2Tag', 'Up to 1v3'), title: t('showcase3d.mode2', 'Real-time party versus'), body: t('showcase3d.mode2Body', 'Four cubes, one live board, zero mercy. The loudest scoreboard wins.'), video: '/videos/reddit-vs-battle.mp4', poster: '/showcase3d/poster-reddit-vs-battle.jpg' },
    { side: 'left', accent: 'bg-neo-purple', tag: t('showcase3d.mode3Tag', '5 languages'), title: t('showcase3d.mode3', 'Play in your language'), body: t('showcase3d.mode3Body', 'Hebrew, English, Swedish, Japanese, Spanish — your words, your turf.'), video: '/videos/reddit-multilingual-showcase.mp4', poster: '/showcase3d/poster-reddit-multilingual-showcase.jpg' },
  ];

  // pinned multi-chapter scroll-scrub (proven scroll-showcase machinery)
  useGSAP(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const playhead = { frame: 0 };
      const images: HTMLImageElement[] = FRAMES.map((url) => {
        const img = new window.Image();
        img.src = url;
        return img;
      });
      const draw = () => {
        const img = images[Math.round(playhead.frame)];
        if (img && img.complete && img.naturalWidth) {
          if (canvas.width !== img.naturalWidth) {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
      };
      if (images[0].complete) draw();
      else images[0].onload = draw;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        playhead.frame = TOTAL - 1;
        draw();
        gsap.set('.s3-cap', { autoAlpha: 1, position: 'static' });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section.current, start: 'top top', end: '+=560%', pin: pinWrap.current, scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.to(playhead, { frame: TOTAL - 1, ease: 'none', duration: 1, onUpdate: draw }, 0);
      captions.forEach((cap, i) => {
        const [enter, exit] = cap.window;
        tl.fromTo(`.s3-cap-${i}`, { autoAlpha: 0, yPercent: 26 }, { autoAlpha: 1, yPercent: 0, duration: 0.07 }, enter);
        tl.to(`.s3-cap-${i}`, { autoAlpha: 0, yPercent: -26, duration: 0.07 }, exit);
      });
    },
    { scope: section },
  );

  // page life: marquee loop, floating word-dust, CTA pop
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to('.s3-marquee-track', { xPercent: isRTL ? 50 : -50, repeat: -1, duration: 22, ease: 'none' });
        gsap.to('.s3-dust', {
          y: '+=22',
          rotation: '+=10',
          duration: () => 2.4 + Math.random() * 2.2,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          stagger: { each: 0.3, from: 'random' },
        });
        gsap.from('.s3-cta-pop', {
          scale: 0.94,
          autoAlpha: 0,
          y: 30,
          duration: 0.6,
          ease: 'back.out(1.4)',
          scrollTrigger: { trigger: ctaRef.current, start: 'top 85%' },
        });
      });
    },
    { scope: modesRef },
  );

  return (
    <main className="bg-neo-navy text-neo-cream">
      {/* ── PINNED MULTI-CHAPTER SCROLL-SCRUB HERO ───────────── */}
      <section ref={section} className="relative">
        <div ref={pinWrap} className="texture-halftone relative h-[100svh] w-full overflow-hidden bg-neo-navy">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neo-navy via-neo-navy/40 to-neo-navy/15" />
          <p className="absolute left-5 top-6 font-neo-display text-xl font-bold uppercase tracking-widest text-neo-lime drop-shadow-[2px_2px_0_rgb(10,10,18)] sm:left-10">
            LexiClash
          </p>
          <div className="absolute inset-x-0 bottom-[14%] flex justify-center px-6">
            <div className="relative h-52 w-full max-w-2xl">
              {captions.map((cap, i) => (
                <div key={cap.title} className={`s3-cap s3-cap-${i} absolute inset-0 text-center`}>
                  {cap.badge && (
                    <span className="mb-3 inline-block rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1 font-neo-display text-xs font-bold uppercase tracking-widest text-black shadow-hard">
                      {cap.badge}
                    </span>
                  )}
                  <h2 className="mt-2 font-neo-display text-4xl font-bold leading-[0.95] text-neo-cream drop-shadow-[3px_3px_0_rgba(0,0,0,0.85)] sm:text-6xl">{cap.title}</h2>
                  <p className="mx-auto mt-3 max-w-xl font-neo-body text-base text-neo-cream/90 drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)] sm:text-lg">{cap.body}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce font-neo-body text-xs uppercase tracking-widest text-neo-cream/55">
            ↓ {t('showcase3d.scrollHint', 'Scroll to play')}
          </p>
        </div>
      </section>

      {/* ── LETTER MARQUEE TICKER ─────────────────────────────── */}
      <div className="overflow-hidden border-y-[3px] border-black bg-neo-lime py-3">
        <div className="s3-marquee-track flex w-max gap-8 whitespace-nowrap font-neo-display text-2xl font-bold uppercase tracking-wider text-black">
          {[...MARQUEE, ...MARQUEE, ...MARQUEE, ...MARQUEE].map((w, i) => (
            <span key={i} className="flex items-center gap-8">
              {w}
              <span aria-hidden className="inline-block h-3 w-3 rotate-45 border-2 border-black bg-neo-navy" />
            </span>
          ))}
        </div>
      </div>

      {/* ── MODE SHOWCASE (scroll-revealed 3D gameplay) ──────── */}
      <section ref={modesRef} className="relative overflow-hidden px-5 py-24 lg:px-10">
        {/* floating word-dust */}
        {[
          { ch: 'A', c: 'bg-neo-cyan', s: 'left-[6%] top-[12%]' },
          { ch: 'Z', c: 'bg-neo-pink', s: 'right-[8%] top-[20%]' },
          { ch: 'Q', c: 'bg-neo-purple', s: 'left-[14%] bottom-[16%]' },
          { ch: '+', c: 'bg-neo-lime', s: 'right-[12%] bottom-[24%]' },
          { ch: '!', c: 'bg-neo-pink', s: 'left-[48%] top-[6%]' },
        ].map((d) => (
          <span
            key={d.ch + d.s}
            aria-hidden
            className={`s3-dust pointer-events-none absolute z-0 hidden h-12 w-12 place-items-center rounded-neo border-neo-thick border-black font-neo-display text-xl font-bold text-black opacity-70 shadow-hard sm:grid ${d.c} ${d.s}`}
          >
            {d.ch}
          </span>
        ))}

        <div className="relative z-10 mx-auto max-w-6xl">
          <h2 className="mb-4 font-neo-display text-3xl font-bold sm:text-4xl">{t('showcase3d.modesTitle', 'Three ways to clash')}</h2>
          <p className="mb-16 max-w-[48ch] font-neo-body text-neo-cream/65">{t('showcase3d.modesSub', 'Real rounds, real boards — each one slides in as you scroll.')}</p>
          <div className="flex flex-col gap-24">
            {modes.map((mode) => (
              <GameplayPanel key={mode.title} mode={mode} isRTL={isRTL} />
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
      <section ref={ctaRef} className="mx-auto max-w-6xl px-5 pb-28 lg:px-10">
        <div className="s3-cta-pop relative overflow-hidden rounded-neo-xl border-neo-thick border-black bg-neo-lime px-7 py-14 text-black shadow-hard-xl sm:px-12 sm:py-20">
          <span aria-hidden className="s3-dust absolute right-6 top-6 grid h-14 w-14 rotate-12 place-items-center rounded-neo border-neo-thick border-black bg-neo-navy font-neo-display text-2xl font-bold text-neo-cream shadow-hard">W</span>
          <span aria-hidden className="s3-dust absolute bottom-8 right-24 grid h-10 w-10 -rotate-6 place-items-center rounded-neo border-neo-thick border-black bg-neo-pink font-neo-display text-lg font-bold text-black shadow-hard">!</span>
          <h2 className="relative z-10 max-w-[18ch] font-neo-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95]">{t('showcase3d.bottomTitle', 'Your move. Make it loud.')}</h2>
          <Link
            href={playHref}
            className="relative z-10 mt-7 inline-block rounded-neo border-neo-thick border-black bg-neo-navy px-8 py-4 font-neo-display text-lg font-bold text-neo-cream shadow-hard-lg transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
          >
            {t('showcase3d.bottomCta', 'Play LexiClash free')}
          </Link>
        </div>
      </section>
    </main>
  );
}
