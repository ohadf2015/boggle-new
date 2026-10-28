'use client';

/**
 * Section 4 of the fresh homepage: the game lineup, a bento wall of modes.
 *
 * - Only modes a logged-out visitor can open. crossword / quick-play
 *   remain beta-gated in LandingChallengeCards (and route-guards).
 * - Blast is the recommended mode: it leads as one wide featured card above
 *   the wall, and the wall carries the rest.
 * - Arena is the feature tile (it is the product); the rest vary in size so the
 *   wall has a hierarchy instead of a row of identical cards.
 * - A card click fires the same `mode_card` + `mode_selected` events the hub
 *   cubes fire, so before/after funnels still compare.
 * - Visible at rest. Motion is CSS only (hover lift + art zoom, press), all
 *   behind motion-safe.
 */
import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight, Bot, User, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { MODE_META, MODE_TAGS, modeRoute, type ModeCubeVariant } from '@/lib/landing/modeMeta';
import { trackLandingCtaClick, trackModeSelected } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import styles from '../home/HomeModeGrid.module.css';
import { FeaturedModeCard } from './FeaturedModeCard';

/** Every other public mode is a card: a lone card read as "this site has one game". */
export const FRESH_MODE_KEYS = ['arena', 'adventure', 'wordTowerV2', 'wordCraft', 'connections', 'brainGym'] as const;
type FreshModeKey = (typeof FRESH_MODE_KEYS)[number];

type Shape = 'feature' | 'wide' | 'tall' | 'slim';

/** Bento footprint at lg (12 cols). Phones stack; sm gives two columns with the feature spanning both. */
const SHAPE: Record<FreshModeKey, { shape: Shape; cell: string }> = {
  arena: { shape: 'feature', cell: 'sm:col-span-2 lg:col-span-6 lg:row-span-2' },
  adventure: { shape: 'wide', cell: 'lg:col-span-6' },
  wordTowerV2: { shape: 'tall', cell: 'lg:col-span-3' },
  wordCraft: { shape: 'tall', cell: 'lg:col-span-3' },
  connections: { shape: 'slim', cell: 'lg:col-span-6' },
  brainGym: { shape: 'slim', cell: 'sm:col-span-2 lg:col-span-6' },
};

/** Literal class strings (Tailwind v4 only sees literals). Colour comes from the mode, not the position. */
const TONE: Record<ModeCubeVariant, { border: string; shadow: string; chip: string; arrow: string; dots: string }> = {
  pink: { border: 'border-neo-pink', shadow: 'shadow-hard-pink', chip: 'bg-neo-pink text-neo-navy', arrow: 'bg-neo-pink', dots: '[--dot:var(--neo-pink)]' },
  cyan: { border: 'border-neo-cyan', shadow: 'shadow-hard-cyan', chip: 'bg-neo-cyan text-neo-navy', arrow: 'bg-neo-cyan', dots: '[--dot:var(--neo-cyan)]' },
  purple: { border: 'border-neo-purple', shadow: 'shadow-hard-purple', chip: 'bg-neo-purple text-neo-black', arrow: 'bg-neo-purple', dots: '[--dot:var(--neo-purple)]' },
  orange: { border: 'border-neo-orange', shadow: 'shadow-hard-orange', chip: 'bg-neo-orange text-neo-navy', arrow: 'bg-neo-orange', dots: '[--dot:var(--neo-orange)]' },
  lime: { border: 'border-neo-lime', shadow: 'shadow-hard-lime', chip: 'bg-neo-lime text-neo-navy', arrow: 'bg-neo-lime', dots: '[--dot:var(--neo-lime)]' },
  blue: { border: 'border-blue-500', shadow: 'shadow-hard-blue', chip: 'bg-blue-500 text-neo-black', arrow: 'bg-blue-500', dots: '[--dot:var(--color-blue-500)]' },
};

/**
 * The square cube PNGs fill the art window edge to edge (object-cover), so
 * their baked navy (which varies per file) never shows a seam against the
 * window. Zoom on top of that, measured from each sticker's trimmed bounds so
 * nothing but navy margin is cropped: small-framed stickers get more, and
 * brainGym is already tall, so it stays at 1.
 */
const ART_ZOOM: Partial<Record<FreshModeKey, number>> = {
  arena: 1, wordCraft: 1.15, connections: 1.25, brainGym: 1,
};

/** Literal keys so i18n guards can see them; same chip facts as the returning hub. */
const TAG_LABEL_KEY = {
  solo: 'landing.home.modeTag.solo',
  multiplayer: 'landing.home.modeTag.multiplayer',
  vsBot: 'landing.home.modeTag.vsBot',
} as const;
const TAG_ICON = { solo: User, multiplayer: Users, vsBot: Bot } as const;

/** Layout per shape: phones are always a horizontal row except the feature tile. */
const CARD_SHAPE: Record<Shape, string> = {
  feature: 'flex-col p-3 sm:p-4',
  wide: 'flex-row items-stretch gap-3 p-3 sm:gap-4 sm:p-4',
  tall: 'flex-row items-stretch gap-3 p-3 lg:flex-col lg:gap-0',
  slim: 'flex-row items-stretch gap-3 p-3',
};
const ART_SHAPE: Record<Shape, string> = {
  feature: 'aspect-[16/11] w-full flex-1 min-h-0 sm:aspect-auto sm:min-h-[16rem]',
  wide: 'aspect-square w-[6.5rem] shrink-0 sm:w-[10.5rem]',
  tall: 'aspect-square w-[5.5rem] shrink-0 lg:aspect-[4/3] lg:w-full',
  slim: 'aspect-square w-[5.5rem] shrink-0 sm:w-[6.5rem]',
};

export function ModeRow() {
  const { t, language } = useLanguage();

  const onCardClick = (key: string, featured = false) => {
    trackModeSelected(key, 'home');
    trackLandingCtaClick('mode_card', {
      mode: key, variant: MODE_META[key]?.variant, surface: 'fresh', ...(featured && { featured: true }),
    });
  };

  return (
    <section data-fresh-section="modes" aria-labelledby="fresh-modes-title" className="w-full py-12 md:py-16">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2
          id="fresh-modes-title"
          className="font-neo-poster text-[1.75rem] font-extrabold leading-[1.08] tracking-[-0.01em] text-neo-cream text-balance [overflow-wrap:anywhere] sm:text-4xl md:text-5xl"
        >
          {t('homeFresh.modes.title')}
        </h2>
        <p className="mt-3 max-w-[40ch] font-neo-body text-base leading-relaxed text-neo-cream/80 md:text-lg">
          {t('homeFresh.modes.line')}
        </p>

        <FeaturedModeCard onPick={(key) => onCardClick(key, true)} />

        <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
          {FRESH_MODE_KEYS.map((key, idx) => {
            const meta = MODE_META[key];
            const href = modeRoute(key, language);
            if (!meta?.genIcon || !href) return null;
            const { shape, cell } = SHAPE[key];
            const tone = TONE[meta.variant];
            const feature = shape === 'feature';
            const zoom = ART_ZOOM[key] ?? 1;
            const tag = MODE_TAGS[key];
            const TagIcon = tag ? TAG_ICON[tag.players] : null;
            const artScale: CSSProperties | undefined = zoom > 1 ? { transform: `scale(${zoom})` } : undefined;
            return (
              <li key={key} className={cn('flex', cell, styles.rise)} style={{ '--i': idx } as CSSProperties}>
                <Link
                  href={href}
                  data-mode={key}
                  data-shape={shape}
                  onClick={() => onCardClick(key)}
                  className={cn(
                    'group relative flex w-full rounded-neo border-3 bg-neo-navy-light text-neo-cream',
                    tone.border,
                    tone.shadow,
                    CARD_SHAPE[shape],
                    'motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out',
                    'motion-safe:hover:-translate-y-1',
                    'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
                    'focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cream'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute inset-0 rounded-[inherit] opacity-40 [background-image:radial-gradient(var(--dot)_1.5px,transparent_1.5px)] [background-size:14px_14px] [mask-image:linear-gradient(to_bottom,transparent_45%,black)]',
                      tone.dots
                    )}
                  />
                  <div className={cn('relative overflow-hidden rounded-[6px] border-2 border-neo-cream/40 bg-neo-navy', ART_SHAPE[shape])}>
                    <div className="absolute inset-0" style={artScale}>
                      <div className={cn('absolute inset-0', styles.art)} style={{ '--i': idx } as CSSProperties}>
                        <Image
                          src={meta.genIcon}
                          alt=""
                          fill
                          loading="lazy"
                          sizes={feature ? '(min-width: 1024px) 560px, 100vw' : '(min-width: 1024px) 280px, 168px'}
                          className="select-none object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={cn('flex min-w-0 flex-1 flex-col gap-2', feature ? 'mt-4 flex-none' : 'justify-center lg:group-data-[shape=tall]:mt-3')}>
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        className={cn(
                          'font-neo-display font-bold leading-tight text-neo-white',
                          feature ? 'font-neo-poster text-3xl sm:text-4xl' : 'text-lg sm:text-xl'
                        )}
                      >
                        {t(`homeFresh.modes.items.${key}.title`)}
                      </h3>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'grid shrink-0 place-items-center rounded-full border-3 border-neo-black text-neo-navy',
                          tone.arrow,
                          feature ? 'h-11 w-11' : 'h-8 w-8',
                          'motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:translate-x-1 motion-safe:group-hover:scale-110 rtl:motion-safe:group-hover:-translate-x-1'
                        )}
                      >
                        <DirectionalIcon icon={ArrowRight} className={feature ? 'h-5 w-5' : 'h-4 w-4'} />
                      </span>
                    </div>
                    <p className={cn('font-neo-body leading-snug text-neo-cream/80', feature ? 'max-w-[36ch] text-base' : 'text-sm')}>
                      {t(`homeFresh.modes.items.${key}.line`)}
                    </p>
                    {tag && TagIcon && (
                      <>
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-0.5 w-full origin-left [background-image:repeating-linear-gradient(90deg,var(--dot)_0_6px,transparent_6px_12px)] rtl:origin-right',
                            'motion-safe:scale-x-50 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:group-hover:scale-x-100',
                            tone.dots
                          )}
                        />
                        <span
                          data-testid="mode-tag"
                          className={cn(
                            'inline-flex w-fit items-center gap-1 rounded-full border-2 border-neo-black px-2 py-0.5 font-neo-body text-xs font-bold leading-none',
                            tone.chip
                          )}
                        >
                          <TagIcon className="h-3 w-3" strokeWidth={2.75} aria-hidden="true" />
                          {t(TAG_LABEL_KEY[tag.players])}
                          {tag.untimed && (
                            <>
                              <span aria-hidden="true">·</span>
                              {t('landing.home.modeTag.untimed')}
                            </>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
