'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '@/contexts/LanguageContext';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import GameplayPanel, { type Mode } from '@/components/showcase3d/GameplayPanel';
import Split3DHeading from '@/components/showcase3d/Split3DHeading';
import FloatingCTA from '@/components/showcase3d/FloatingCTA';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import FaqAccordion from '@/components/showcase3d/FaqAccordion';
import { loadPercent, isPlayable } from '@/lib/showcase3d/loadProgress';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

// Evenly sample n frames (1-indexed jpgs) from a chapter dir that holds `total`.
const sampleFrames = (dir: string, total: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const idx = Math.round(1 + (i * (total - 1)) / (n - 1));
    return `${dir}/${String(idx).padStart(4, '0')}.jpg`;
  });

// Four no-mascot gameplay chapters scrub one after another, each with progressive
// motion so scrubbing feels like driving the play: spell → combo → versus → win.
const CH_BOARD = sampleFrames('/showcase3d/gp-board', 125, 84); // trace a word, tiles light up
const CH_COMBO = sampleFrames('/showcase3d/gp-combo', 125, 80); // chain ignites, combo ticks up
const CH_VS = sampleFrames('/showcase3d/gp-versus', 125, 80); // 1v3 live scoreboard battle
const CH_WIN = sampleFrames('/showcase3d/gp-win', 125, 84); // WINNER banner + confetti
const FRAMES = [...CH_BOARD, ...CH_COMBO, ...CH_VS, ...CH_WIN];
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

const MARQUEE = ['SPELL', 'CHAIN', 'COMBO', 'VERSUS', 'DAILY', 'STEAL THE WIN', '5 LANGUAGES'];

export default function Showcase3DClient({ locale }: Showcase3DClientProps) {
  const { t } = useLanguage();
  const isRTL = locale === 'he';
  const playHref = `/${locale}`;

  // frame-sequence preload progress -> branded loader over the canvas
  const [framesLoaded, setFramesLoaded] = useState(0);
  const ready = isPlayable(framesLoaded, TOTAL);
  const percent = loadPercent(framesLoaded, TOTAL);

  const main = useRef<HTMLElement>(null);
  const section = useRef<HTMLElement>(null);
  const pinWrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modesRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null); // live score, counts with scrub
  const barRef = useRef<HTMLDivElement>(null); // top playback progress bar
  const stRef = useRef<ScrollTrigger | null>(null); // scrub trigger, for chapter jump
  const marqRef = useRef<gsap.core.Tween | null>(null); // marquee loop, velocity-reactive

  // chapter rail: click to scrub-jump to a chapter's scroll position
  const RAIL = ['Trace', 'Chain', 'Beat', 'Take'];
  const jumpTo = (i: number) => {
    const st = stRef.current;
    if (!st) return;
    window.scrollTo({ top: st.start + (i * 0.25) * (st.end - st.start), behavior: 'smooth' });
  };

  const captions: Caption[] = [
    { badge: t('showcase3d.heroBadge', 'A world of words'), title: t('showcase3d.cap0Title', 'Trace the word'), body: t('showcase3d.cap0Body', 'Drag across the board — letters light up as you go.'), window: [0.0, 0.2] },
    { title: t('showcase3d.cap1Title', 'Chain the combo'), body: t('showcase3d.cap1Body', 'Link words back-to-back to ignite score multipliers.'), window: [0.27, 0.46] },
    { title: t('showcase3d.cap2Title', 'Beat the room'), body: t('showcase3d.cap2Body', 'Outscore up to three rivals on one live board.'), window: [0.53, 0.71] },
    { title: t('showcase3d.cap3Title', 'Take the crown'), body: t('showcase3d.cap3Body', 'Top the scoreboard and claim the win — out loud.'), window: [0.77, 0.99] },
  ];

  // Per-chapter side flares: a punchy HUD chip slams in from alternating edges
  // (left/right/left/right) as each chapter scrubs, echoing the chapter rail
  // word. Symbols are language-neutral; the label reuses the rail i18n key.
  const sideAccents = [
    { side: 'left' as const, bg: 'bg-neo-cyan', big: '+10', window: captions[0].window },
    { side: 'right' as const, bg: 'bg-neo-pink', big: '×3', window: captions[1].window },
    { side: 'left' as const, bg: 'bg-neo-purple', big: '1v3', window: captions[2].window },
    { side: 'right' as const, bg: 'bg-neo-yellow', big: '★', window: captions[3].window },
  ];

  const modes: Mode[] = [
    { side: 'left', accent: 'bg-neo-cyan', tag: t('showcase3d.mode1Tag', 'Solo · Daily'), title: t('showcase3d.mode1', 'One board. One shot.'), body: t('showcase3d.mode1Body', 'The same daily grid for everyone. Climb the global rank before midnight.'), video: '/videos/reddit-gameplay-demo.mp4', poster: '/showcase3d/poster-reddit-gameplay-demo.jpg' },
    { side: 'right', accent: 'bg-neo-pink', tag: t('showcase3d.mode2Tag', 'Up to 1v3'), title: t('showcase3d.mode2', 'Real-time party versus'), body: t('showcase3d.mode2Body', 'Four cubes, one live board, zero mercy. The loudest scoreboard wins.'), video: '/videos/reddit-vs-battle.mp4', poster: '/showcase3d/poster-reddit-vs-battle.jpg' },
    { side: 'left', accent: 'bg-neo-purple', tag: t('showcase3d.mode3Tag', '5 languages'), title: t('showcase3d.mode3', 'Play in your language'), body: t('showcase3d.mode3Body', 'Hebrew, English, Swedish, Japanese, Spanish — your words, your turf.'), video: '/videos/reddit-multilingual-showcase.mp4', poster: '/showcase3d/poster-reddit-multilingual-showcase.jpg' },
  ];

  // pinned multi-chapter scroll-scrub: canvas frame-sequence driven by ScrollTrigger scrub
  useGSAP(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const playhead = { frame: 0 };
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

      // Preload every frame; count each decode (and each failure, so the loader
      // can never hang) to drive the branded progress overlay. Paint frame 0 the
      // instant it lands so the hero reveals the moment it's playable.
      let loadedCount = 0;
      const bumpLoaded = () => setFramesLoaded((loadedCount += 1));
      const images: HTMLImageElement[] = FRAMES.map((url, i) => {
        const img = new window.Image();
        const onDone = () => {
          bumpLoaded();
          // paint whichever frame the playhead currently points at the moment it
          // lands — covers frame 0 (normal) AND the last frame (reduced-motion,
          // where playhead is parked at TOTAL-1) so the canvas is never blank.
          if (i === Math.round(playhead.frame)) draw();
        };
        if (img.complete && img.naturalWidth) {
          queueMicrotask(onDone); // already cached — `images` is assigned by then
        } else {
          img.onload = onDone;
          img.onerror = bumpLoaded;
        }
        img.src = url;
        return img;
      });

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        playhead.frame = TOTAL - 1;
        draw();
        // no scrub → show only the final caption (matches the WINNER end frame)
        // instead of stacking all four on top of each other.
        gsap.set('.s3-cap', { autoAlpha: 0 });
        gsap.set(`.s3-cap-${captions.length - 1}`, { autoAlpha: 1, position: 'static' });
        return;
      }

      const segs = gsap.utils.toArray<HTMLElement>('.s3-railseg');
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: '+=1000%', // long pin = each frame gets more scroll = no fast-forward feel
          pin: pinWrap.current,
          scrub: 0.6,
          invalidateOnRefresh: true,
          // live HUD: progress drives the score counter, top bar, and active chapter
          onUpdate: (self) => {
            const p = self.progress;
            if (scoreRef.current) scoreRef.current.textContent = Math.round(p * 99999).toLocaleString();
            if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
            const idx = Math.min(segs.length - 1, Math.floor(p * 4));
            for (let i = 0; i < segs.length; i++) segs[i].classList.toggle('s3-railseg-on', i === idx);
          },
        },
      });
      stRef.current = tl.scrollTrigger ?? null;
      tl.to(playhead, { frame: TOTAL - 1, ease: 'none', duration: 1, onUpdate: draw }, 0);
      const sign = isRTL ? -1 : 1;
      captions.forEach((cap, i) => {
        const [enter, exit] = cap.window;
        const sel = `.s3-cap-${i}`;
        // 3D panel that tilts THROUGH its window as you scroll (all transform — safe on scrub):
        // enters steeply pitched back + pushed into depth, settles, keeps rotating while held, tilts away.
        tl.fromTo(
          sel,
          { autoAlpha: 0, yPercent: 42, rotationX: 78, rotationY: sign * -14, z: -260, transformPerspective: 620, transformOrigin: '50% 50% -60px' },
          { autoAlpha: 1, yPercent: 0, rotationX: 10, rotationY: sign * -4, z: 0, duration: 0.06, ease: 'power2.out' },
          enter,
        );
        tl.to(sel, { rotationX: -10, rotationY: sign * 6, duration: Math.max(0.01, exit - enter - 0.12), ease: 'none' }, enter + 0.06);
        tl.to(sel, { autoAlpha: 0, yPercent: -42, rotationX: -78, z: -260, duration: 0.06, ease: 'power2.in' }, exit - 0.06);
      });

      // side flares: slam in from the matching edge, drift + counter-rotate while
      // held, then rocket back off-screen — alternating sides keep the eye moving.
      sideAccents.forEach((a, i) => {
        const [enter, exit] = a.window;
        const sel = `.s3-side-${i}`;
        const dir = a.side === 'left' ? -1 : 1; // off-screen direction (physical L/R)
        tl.fromTo(
          sel,
          { autoAlpha: 0, x: dir * 220, rotation: dir * 16, scale: 0.6, transformPerspective: 600 },
          { autoAlpha: 1, x: 0, rotation: dir * -4, scale: 1, duration: 0.06, ease: 'back.out(2.2)' },
          enter + 0.03,
        );
        tl.to(sel, { y: '-=18', rotation: dir * 5, duration: Math.max(0.01, exit - enter - 0.16), ease: 'sine.inOut' }, enter + 0.09);
        tl.to(sel, { autoAlpha: 0, x: dir * 220, scale: 0.6, duration: 0.06, ease: 'power2.in' }, exit - 0.04);
      });
    },
    { scope: section },
  );

  // page life: marquee (velocity-reactive) + floating word-dust + CTA pop
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        marqRef.current = gsap.to('.s3-marquee-track', { xPercent: isRTL ? 50 : -50, repeat: -1, duration: 22, ease: 'none' });
        // scroll faster -> marquee races; settles back to 1x as you slow
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => {
            if (!marqRef.current) return;
            const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 450);
            gsap.to(marqRef.current, { timeScale: boost, duration: 0.4, overwrite: true });
          },
        });
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
    { scope: main },
  );

  return (
    <main ref={main} className="bg-neo-navy text-neo-white">
      {/* crawlable, localized SEO/GEO content (visually hidden, in SSR HTML) */}
      <GamePageSeoContent
        asH1
        title={`${t('showcase3d.heroBadge', 'A world of words')} — LexiClash`}
        description={`${t('showcase3d.modesSub', 'Real rounds, real boards.')} ${t('showcase3d.bottomTitle', 'Your move. Make it loud.')} ${t('showcase3d.cap0Body', '')} ${t('showcase3d.cap1Body', '')}`}
        features={[
          `${t('showcase3d.mode1Tag', 'Solo · Daily')}: ${t('showcase3d.mode1Body', '')}`,
          `${t('showcase3d.mode2Tag', 'Up to 1v3')}: ${t('showcase3d.mode2Body', '')}`,
          `${t('showcase3d.mode3Tag', '5 languages')}: ${t('showcase3d.mode3Body', '')}`,
        ]}
      />

      {/* top playback bar — scrubs with the hero progress */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-50 h-1 bg-neo-navy-light">
        <div ref={barRef} className="h-full origin-left bg-neo-lime" style={{ transform: 'scaleX(0)' }} />
      </div>

      <TopBackLink className="mb-4" />

      {/* ── PINNED MULTI-CHAPTER SCROLL-SCRUB HERO ───────────── */}
      <section ref={section} className="relative">
        <div ref={pinWrap} className="texture-halftone relative h-[100svh] w-full overflow-hidden bg-neo-navy">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />

          {/* branded loading overlay — covers the blank canvas while the frame
              sequence decodes, then fades out the instant it's playable */}
          <div
            aria-hidden={ready}
            className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-7 bg-neo-navy px-6 text-center transition-opacity duration-700 ${ready ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
          >
            <div className="flex gap-2" aria-hidden>
              {['L', 'E', 'X', 'I'].map((ch, i) => (
                <span
                  key={ch}
                  className="grid h-12 w-12 animate-bounce place-items-center rounded-neo border-neo-thick border-black bg-neo-lime font-neo-display text-2xl font-bold text-black shadow-hard sm:h-14 sm:w-14"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  {ch}
                </span>
              ))}
            </div>
            <div className="w-full max-w-xs">
              <div className="h-4 w-full overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy-light shadow-hard">
                <div
                  className="h-full origin-left bg-neo-lime transition-transform duration-200 ease-out"
                  style={{ transform: `scaleX(${percent / 100})` }}
                />
              </div>
              <p className="mt-3 font-neo-body text-sm font-bold uppercase tracking-widest text-neo-white">
                {t('showcase3d.loading', 'Loading the board')} · {percent}%
              </p>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neo-navy via-neo-navy/40 to-neo-navy/15" />
          {/* right-edge fade so the score + chapter rail stay legible above the video */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-64 bg-gradient-to-l from-neo-navy/90 via-neo-navy/45 to-transparent lg:block" />
          {/* top fade for the score chip + wordmark */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-28 bg-gradient-to-b from-neo-navy/85 to-transparent" />
          <p className="absolute left-5 top-6 z-20 font-neo-display text-xl font-bold uppercase tracking-widest text-neo-lime drop-shadow-[2px_2px_0_rgb(10,10,18)] sm:left-10">
            LexiClash
          </p>

          {/* live score — counts up as you scrub (compact on mobile, fuller on sm+) */}
          <div className="absolute right-3 top-4 z-20 flex items-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy-light px-2.5 py-1 shadow-hard sm:right-4 sm:top-5 sm:gap-2 sm:px-3 sm:py-1.5">
            <span className="font-neo-body text-[9px] font-bold uppercase tracking-widest text-neo-white sm:text-[10px]">
              {t('showcase3d.scoreLabel', 'Score')}
            </span>
            <span ref={scoreRef} className="font-neo-display text-base font-bold leading-none text-neo-lime tabular-nums sm:text-lg">0</span>
          </div>

          {/* chapter rail — active highlights with scrub; click to jump */}
          <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex">
            {RAIL.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={t(`showcase3d.rail${i}`, label)}
                className="s3-railseg group flex items-center justify-end gap-2"
              >
                <span className="font-neo-display text-xs font-bold uppercase tracking-wide text-neo-white transition-all duration-200 group-hover:text-neo-white group-[.s3-railseg-on]:text-neo-white">
                  {t(`showcase3d.rail${i}`, label)}
                </span>
                <span className="h-3 w-3 rounded-full border-neo border-black bg-neo-cream/30 transition-all duration-200 group-[.s3-railseg-on]:scale-150 group-[.s3-railseg-on]:bg-neo-lime" />
              </button>
            ))}
          </div>
          {/* alternating side flares — a chapter chip punches in from the matching
              edge as you scrub. Small + edge-hugging on mobile, bigger on sm+. */}
          {sideAccents.map((a, i) => (
            <div
              key={a.big}
              aria-hidden
              className={`s3-side s3-side-${i} pointer-events-none absolute top-[20%] z-20 opacity-0 ${a.side === 'left' ? 'left-2 sm:left-6' : 'right-2 sm:right-6'}`}
            >
              <div className={`flex flex-col items-center gap-0.5 rounded-neo border-neo-thick border-black ${a.bg} px-2.5 py-2 shadow-hard sm:gap-1 sm:px-4 sm:py-3`}>
                <span className="font-neo-display text-xl font-bold leading-none text-black sm:text-3xl">{a.big}</span>
                <span className="font-neo-display text-[9px] font-bold uppercase tracking-widest text-black sm:text-xs">
                  {t(`showcase3d.rail${i}`, RAIL[i])}
                </span>
              </div>
            </div>
          ))}

          <div className="absolute inset-x-0 bottom-[14%] flex justify-center px-5 sm:px-6">
            <div className="relative h-52 w-full max-w-2xl">
              {captions.map((cap, i) => (
                <div key={cap.title} className={`s3-cap s3-cap-${i} absolute inset-0 text-center`}>
                  {cap.badge && (
                    <span className="mb-3 inline-block rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1 font-neo-display text-xs font-bold uppercase tracking-widest text-black shadow-hard">
                      {cap.badge}
                    </span>
                  )}
                  <h2 className="mt-2 font-neo-display text-4xl font-bold leading-[0.95] text-neo-white sm:text-6xl" style={{ textShadow: '0 1px 0 #0a0a12,0 2px 0 #0a0a12,0 3px 0 #0a0a12,0 4px 0 #0a0a12,0 5px 0 rgba(0,255,255,0.65),0 6px 0 #0a0a12,0 7px 0 #0a0a12,0 8px 0 #0a0a12,0 10px 0 rgba(255,20,147,0.45),0 16px 24px rgba(0,0,0,0.6)' }}>{cap.title}</h2>
                  <p className="mx-auto mt-3 max-w-xl font-neo-body text-base text-neo-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)] sm:text-lg">{cap.body}</p>
                </div>
              ))}
            </div>
          </div>
          {/* scroll cue — a loud pill + bouncing arrow so it reads as "keep going down" */}
          <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
            <span className="rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-1.5 font-neo-display text-sm font-bold uppercase tracking-widest text-black shadow-hard">
              {t('showcase3d.scrollHint', 'Scroll to play')}
            </span>
            <span aria-hidden className="animate-bounce font-neo-display text-3xl font-bold leading-none text-neo-lime drop-shadow-[2px_2px_0_rgb(10,10,18)]">
              ↓
            </span>
          </div>
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
          <Split3DHeading text={t('showcase3d.modesTitle', 'Three ways to clash')} className="mb-4 font-neo-display text-3xl font-bold sm:text-4xl" />
          <p className="mb-16 max-w-[48ch] font-neo-body text-neo-white">{t('showcase3d.modesSub', 'Real rounds, real boards — each one slides in as you scroll.')}</p>
          <div className="flex flex-col gap-24">
            {modes.map((mode) => (
              <GameplayPanel key={mode.title} mode={mode} isRTL={isRTL} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ (visible + crawlable) ────────────────────────── */}
      <FaqAccordion
        title={t('showcase3d.faqTitle', 'Questions, answered')}
        items={[1, 2, 3, 4, 5, 6]
          .map((i) => ({ q: t(`showcase3d.faqQ${i}`, ''), a: t(`showcase3d.faqA${i}`, '') }))
          .filter((f) => f.q && f.a)}
      />

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
      <section ref={ctaRef} className="mx-auto max-w-6xl px-5 pb-28 lg:px-10">
        <div className="s3-cta-pop relative overflow-hidden rounded-neo-xl border-neo-thick border-black bg-neo-lime px-7 py-14 text-black shadow-hard-xl sm:px-12 sm:py-20">
          <span aria-hidden className="s3-dust absolute right-6 top-6 grid h-14 w-14 rotate-12 place-items-center rounded-neo border-neo-thick border-black bg-neo-navy font-neo-display text-2xl font-bold text-neo-white shadow-hard">W</span>
          <span aria-hidden className="s3-dust absolute bottom-8 right-24 grid h-10 w-10 -rotate-6 place-items-center rounded-neo border-neo-thick border-black bg-neo-pink font-neo-display text-lg font-bold text-black shadow-hard">!</span>
          <Split3DHeading text={t('showcase3d.bottomTitle', 'Your move. Make it loud.')} className="relative z-10 max-w-[18ch] font-neo-display text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[0.95]" />
          <Link
            href={playHref}
            className="relative z-10 mt-7 inline-block rounded-neo border-neo-thick border-black bg-neo-navy px-8 py-4 font-neo-display text-lg font-bold text-neo-white shadow-hard-lg transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5"
          >
            {t('showcase3d.bottomCta', 'Play LexiClash free')}
          </Link>
        </div>
      </section>

      <FloatingCTA href={playHref} label={t('showcase3d.floatCta', 'Play free')} isRTL={isRTL} hideBelow={ctaRef} />
    </main>
  );
}
