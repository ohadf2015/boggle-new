'use client';

/**
 * Section 4 of the fresh homepage: a swipeable scroll-snap row of game modes.
 *
 * - Only modes a logged-out visitor can open. Adventure is now public (GA);
 *   crossword / quick-play / sealed-bid remain beta-gated in
 *   LandingChallengeCards (and route-guards), so they don't appear here.
 * - Order is newcomer-first: blast ranks lowest for first-day players
 *   (lib/landing/newcomerModeOrder.ts), so it goes last. Arena removed to avoid
 *   clutter — the returning-visitor hub surfaces it prominently.
 * - A card click fires the same `mode_card` + `mode_selected` events the hub
 *   cubes fire, so before/after funnels still compare.
 * - Featured cards (adventure, wordTowerV2) display a NEW badge.
 * - Visible at rest. Motion is CSS only (hover lift + art zoom, press tilt),
 *   all behind motion-safe. Prev/next buttons scroll by direction (RTL-safe).
 */
import Image from 'next/image';
import Link from 'next/link';
import { useRef, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { MODE_META, modeRoute } from '@/lib/landing/modeMeta';
import { trackLandingCtaClick, trackModeSelected } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

export const FRESH_MODE_KEYS = ['adventure', 'wordTowerV2', 'wordCraft', 'connections', 'brainGym', 'blast'] as const;
type FreshModeKey = (typeof FRESH_MODE_KEYS)[number];

/** Literal class strings (Tailwind v4 only sees literals). Neighbours never share a colour. */
const CARD_TONE = ['bg-neo-pink', 'bg-neo-lime', 'bg-neo-cyan', 'bg-neo-purple'] as const;
/** Resting tilt alternates so the row reads as a hand of cards, not a table. */
const CARD_TILT = ['-rotate-1', 'rotate-1'] as const;
/**
 * The square cube PNGs fill the 4:3 art window edge to edge (object-cover), so
 * their baked navy (which varies per file) never shows a seam against the
 * window. Zoom on top of that, measured from each sticker's trimmed bounds so
 * nothing but navy margin is cropped: small-framed stickers get more, blast
 * bleeds its FX to the edge and brainGym is already tall, so they stay at 1.
 */
const ART_ZOOM: Record<FreshModeKey, number> = {
  adventure: 1.1, wordTowerV2: 1, wordCraft: 1.15, connections: 1.25, brainGym: 1, blast: 1,
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ModeRow() {
  const { t, language, dir } = useLanguage();
  const rowRef = useRef<HTMLUListElement>(null);

  /** step > 0 = forward in reading order. RTL rows grow leftward, so flip the sign. */
  const page = (step: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const distance = Math.max(row.clientWidth * 0.8, 240) * step * (dir === 'rtl' ? -1 : 1);
    row.scrollBy({ left: distance, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const onCardClick = (key: FreshModeKey) => {
    trackModeSelected(key, 'home');
    trackLandingCtaClick('mode_card', { mode: key, variant: MODE_META[key]?.variant, surface: 'fresh' });
  };

  return (
    <section data-fresh-section="modes" aria-labelledby="fresh-modes-title" className="w-full py-14 md:py-24">
      <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <div>
          <h2
            id="fresh-modes-title"
            className="font-neo-display text-3xl font-bold leading-[1.08] text-neo-cream text-balance sm:text-4xl md:text-5xl"
          >
            {t('homeFresh.modes.title')}
          </h2>
          <p className="mt-3 max-w-[40ch] font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg">
            {t('homeFresh.modes.line')}
          </p>
        </div>
        <div className="hidden shrink-0 gap-3 md:flex">
          <PagerButton label={t('homeFresh.modes.prev')} icon={ArrowLeft} onClick={() => page(-1)} />
          <PagerButton label={t('homeFresh.modes.next')} icon={ArrowRight} onClick={() => page(1)} />
        </div>
      </div>

      <ul
        ref={rowRef}
        className={cn(
          // Full-bleed row: cards start on the heading's gutter but run to the
          // viewport edge, so the next card peeks at every width (swipe cue).
          'mt-8 grid w-full grid-flow-col gap-4 overflow-x-auto overscroll-x-contain px-4 pb-8 pt-3 md:gap-5',
          'auto-cols-[74%] sm:auto-cols-[42%] md:auto-cols-[31%] lg:auto-cols-[16rem]',
          'snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 sm:px-6',
          'lg:scroll-px-[max(2rem,calc((100%-72rem)/2+2rem))] lg:px-[max(2rem,calc((100%-72rem)/2+2rem))]',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        )}
      >
        {FRESH_MODE_KEYS.map((key, i) => {
          const meta = MODE_META[key];
          const href = modeRoute(key, language);
          if (!meta?.genIcon || !href) return null;
          const artScale: CSSProperties | undefined =
            ART_ZOOM[key] > 1 ? { transform: `scale(${ART_ZOOM[key]})` } : undefined;
          const isFeatured = key === 'adventure' || key === 'wordTowerV2';
          return (
            <li key={key} className="flex snap-start">
              <Link
                href={href}
                data-mode={key}
                onClick={() => onCardClick(key)}
                className={cn(
                  'group relative flex w-full flex-col rounded-neo border-3 border-neo-black p-3 text-neo-black shadow-hard-xl',
                  CARD_TONE[i % CARD_TONE.length],
                  CARD_TILT[i % CARD_TILT.length],
                  'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out',
                  'hover:rotate-0 motion-safe:hover:-translate-y-1',
                  'active:translate-y-[3px] active:rotate-[-3deg] active:scale-[0.97] active:shadow-hard-pressed',
                  'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cream'
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] border-3 border-neo-black bg-neo-navy">
                  <div className="absolute inset-0" style={artScale}>
                    <Image
                      src={meta.genIcon}
                      alt=""
                      fill
                      loading="lazy"
                      sizes="(min-width: 1024px) 260px, (min-width: 640px) 42vw, 74vw"
                      className="select-none object-cover motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-[1.08] motion-safe:group-active:scale-95"
                    />
                  </div>
                  {isFeatured && meta.badge && (
                    <span
                      data-testid="mode-badge"
                      className="absolute top-1 end-1 z-10 rounded-full border-2 border-neo-black bg-neo-lime px-1.5 py-0.5 font-neo-display text-[0.6rem] font-black uppercase leading-none tracking-wide text-neo-navy shadow-hard-sm"
                    >
                      {t(`landing.badge.${meta.badge.toLowerCase()}`)}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-1 items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-neo-display text-xl font-bold leading-tight">
                      {t(`homeFresh.modes.items.${key}.title`)}
                    </h3>
                    <p className="mt-1 font-neo-body text-sm leading-snug">
                      {t(`homeFresh.modes.items.${key}.line`)}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-neo border-3 border-neo-black bg-neo-cream motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5 rtl:motion-safe:group-hover:-translate-x-0.5"
                  >
                    <DirectionalIcon icon={ArrowRight} className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

interface PagerButtonProps {
  label: string;
  icon: typeof ArrowLeft;
  onClick: () => void;
}

function PagerButton({ label, icon, onClick }: PagerButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        'grid h-12 w-12 place-items-center rounded-neo border-3 border-neo-black bg-neo-cream text-neo-black shadow-hard-lg',
        'active:translate-y-[2px] active:shadow-hard-pressed motion-safe:transition-transform motion-safe:hover:-translate-y-0.5',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cream'
      )}
    >
      <DirectionalIcon icon={icon} className="h-5 w-5" />
    </button>
  );
}
