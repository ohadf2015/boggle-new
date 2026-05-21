'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useLanguage } from '@/contexts/LanguageContext';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

const CH1_COUNT = 130;
const CH2_COUNT = 130;

interface Caption {
  badge?: string;
  kicker?: string;
  title: string;
  body: string;
  /** [enter, exit] as fractions of the pinned scroll timeline (0..1). */
  window: [number, number];
}

const frameUrls = (dir: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${dir}/${String(i + 1).padStart(4, '0')}.jpg`);

interface ScrollShowcaseClientProps {
  locale: string;
}

/**
 * Apple-style scroll-frame landing. A single full-bleed <canvas> is pinned while
 * the user scrolls; scroll progress drives an image-sequence playhead across two
 * concatenated gameplay clips (board → tiles igniting), and captions fade in/out
 * along the same timeline — so there is no seam between "chapters". Image-sequence
 * scrubbing (vs seeking video.currentTime) stays smooth in both directions and on
 * mobile. Frames are pre-extracted at design time from MJ-generated clips.
 */
export default function ScrollShowcaseClient({ locale }: ScrollShowcaseClientProps) {
  const { t } = useLanguage();
  const section = useRef<HTMLElement>(null);
  const pinWrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardsRef = useRef<HTMLElement>(null);
  const playHref = `/${locale}`;

  const captions: Caption[] = [
    { badge: t('scrollShowcase.badge', 'Scroll to play'), title: t('scrollShowcase.heroTitle', 'Words, but make it a party'), body: t('scrollShowcase.heroSubtitle', 'Race friends across electric word battles. Stack letters. Steal the win.'), window: [0.02, 0.22] },
    { title: t('scrollShowcase.parallaxTitle', 'Every round is a fresh brawl'), body: t('scrollShowcase.parallaxBody', 'Boards spin up in seconds, tiles light up as you chain them, and the loudest scoreboard wins.'), window: [0.27, 0.46] },
    { kicker: t('scrollShowcase.ch2Kicker', 'Win, brag, repeat'), title: t('scrollShowcase.ch2TitleA', 'Chain letters, watch them ignite'), body: t('scrollShowcase.ch2BodyA', 'Every valid word lights the board and pumps your combo meter.'), window: [0.52, 0.72] },
    { title: t('scrollShowcase.ch2TitleB', 'Last cube standing takes the crown'), body: t('scrollShowcase.ch2BodyB', 'Outscore three rivals in real time. Confetti optional, bragging mandatory.'), window: [0.77, 0.96] },
  ];

  useGSAP(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const urls = [...frameUrls('/scroll/seq/ch1', CH1_COUNT), ...frameUrls('/scroll/seq/ch2', CH2_COUNT)];
      const total = urls.length;
      const playhead = { frame: 0 };
      // `Image` is shadowed by next/image — use window.Image for raw bitmaps.
      const images: HTMLImageElement[] = urls.map((url) => {
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
        playhead.frame = 0;
        draw();
        gsap.set('.sc-cap', { autoAlpha: 1, position: 'static' });
        return;
      }

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section.current,
          start: 'top top',
          end: '+=600%',
          pin: pinWrap.current,
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      });
      // Frame scrub occupies the whole timeline [0,1].
      tl.to(playhead, { frame: total - 1, ease: 'none', duration: 1, onUpdate: draw }, 0);
      // Captions fade in/out within their windows (absolute positions on the same timeline).
      captions.forEach((cap, i) => {
        const [enter, exit] = cap.window;
        tl.fromTo(`.sc-cap-${i}`, { autoAlpha: 0, yPercent: 24 }, { autoAlpha: 1, yPercent: 0, duration: 0.07 }, enter);
        tl.to(`.sc-cap-${i}`, { autoAlpha: 0, yPercent: -24, duration: 0.07 }, exit);
      });
    },
    { scope: section },
  );

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.sc-card', {
        y: 56,
        autoAlpha: 0,
        scale: 0.9,
        stagger: 0.12,
        duration: 0.5,
        ease: 'back.out(1.6)',
        scrollTrigger: { trigger: cardsRef.current, start: 'top 78%' },
      });
    },
    { scope: cardsRef },
  );

  const cards = [
    { title: t('scrollShowcase.cardSolo', 'Solo runs'), desc: t('scrollShowcase.cardSoloDesc', 'Beat your own best, no pressure.'), accent: 'bg-neo-cyan', img: '/scroll/card-board.png' },
    { title: t('scrollShowcase.cardVersus', '1v3 versus'), desc: t('scrollShowcase.cardVersusDesc', 'Four players, one trophy.'), accent: 'bg-neo-pink', img: '/scroll/card-versus.png' },
    { title: t('scrollShowcase.cardDaily', 'Daily challenge'), desc: t('scrollShowcase.cardDailyDesc', 'Same board for everyone, every day.'), accent: 'bg-neo-lime', img: '/scroll/card-daily.png' },
  ];

  return (
    <div className="bg-neo-navy text-neo-cream">
      {/* Pinned single-canvas scroll-scrub */}
      <section ref={section} className="relative">
        <div ref={pinWrap} className="relative h-screen w-full overflow-hidden bg-neo-navy">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neo-navy via-neo-navy/35 to-neo-navy/10" />
          {/* Captions — only one visible at a time, fading along the scrub. */}
          <div className="absolute inset-x-0 bottom-[12%] flex justify-center px-6">
            <div className="relative h-48 w-full max-w-2xl">
              {captions.map((cap, i) => (
                <div key={cap.title} className={`sc-cap sc-cap-${i} absolute inset-0 text-center`}>
                  {cap.badge && (
                    <span className="mb-3 inline-block rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1 font-neo-display text-xs font-bold uppercase tracking-widest text-black shadow-hard">
                      {cap.badge}
                    </span>
                  )}
                  {cap.kicker && (
                    <p className="font-neo-display text-sm font-bold uppercase tracking-widest text-neo-cyan">{cap.kicker}</p>
                  )}
                  <h2 className="mt-2 font-neo-display text-3xl font-bold leading-tight text-neo-cream drop-shadow-[3px_3px_0_rgba(0,0,0,0.8)] sm:text-5xl">
                    {cap.title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-xl font-neo-body text-base text-neo-cream/90 drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)] sm:text-lg">
                    {cap.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
          {/* Persistent scroll hint */}
          <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 animate-bounce font-neo-body text-xs uppercase tracking-widest text-neo-cream/55">
            ↓ {t('scrollShowcase.scrollHint', 'Keep scrolling')}
          </p>
        </div>
      </section>

      {/* Mode cards */}
      <section ref={cardsRef} className="px-6 py-24">
        <h2 className="mb-12 text-center font-neo-display text-3xl font-bold text-neo-cream sm:text-4xl">
          {t('scrollShowcase.cardsTitle', 'Pick your mode, pick your fight')}
        </h2>
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="sc-card overflow-hidden rounded-neo-lg border-neo-thick border-black bg-neo-navy-light shadow-hard-lg">
              <div className="relative h-36 w-full border-b-neo-thick border-black">
                <Image src={c.img} alt="" fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover" />
                <span className={`absolute left-3 top-3 h-4 w-4 rounded-full border-neo border-black ${c.accent}`} />
              </div>
              <div className="p-5 text-center">
                <h3 className="font-neo-display text-xl font-bold text-neo-cream">{c.title}</h3>
                <p className="mt-2 font-neo-body text-sm text-neo-cream/75">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-32 pt-8 text-center">
        <h2 className="font-neo-display text-3xl font-bold text-neo-cream sm:text-5xl">
          {t('scrollShowcase.finalTitle', 'Your move, champ')}
        </h2>
        <p className="mx-auto mt-4 max-w-md font-neo-body text-base text-neo-cream/80">
          {t('scrollShowcase.finalBody', 'Jump into a live room — no download, no signup wall.')}
        </p>
        <Link
          href={playHref}
          className="mt-8 inline-block rounded-neo border-neo-thick border-black bg-neo-pink px-8 py-4 font-neo-display text-xl font-bold text-black shadow-hard-lg transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
        >
          {t('scrollShowcase.finalCta', 'Start playing')}
        </Link>
      </section>
    </div>
  );
}
