'use client';

/**
 * LandingModeCubes — the `cubes` variant of the homepage mode section
 * (A/B flag `landing-modes-cubes-v1`). Pure presentation: it receives the
 * already-ordered, already-gated mode models from `LandingChallengeCards`
 * (same computed list the control card grid consumes) and lays them out as a
 * compact neo-brutalist BENTO — arena = a 2×2 colour-drenched anchor, the rest
 * are small 1×1 cubes. This replaces the repeated identical long cards with a
 * varied, glanceable grid that routes in one tap.
 *
 * Motion: a single scroll-driven "rise" reveal (see `.cube-reveal` in
 * globals.css) — visible by default (never ships blank), animates only where
 * the browser supports scroll timelines and the user allows motion.
 */

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Lock, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ModeCubeModel, ModeCubeVariant } from '@/lib/landing/modeMeta';

interface VariantStyle {
  /** solid colour fill (anchor) */
  fill: string;
  /** ink on the solid fill */
  ink: string;
  /** small icon-block bg on navy cubes */
  chip: string;
  /** ink on the icon chip */
  chipInk: string;
  /** coloured hard shadow on hover */
  shadow: string;
  ring: string;
}

// Mirrors ModeCard's variant palette. orange/blue have no coloured hard-shadow
// utility → fall back to shadow-hard-lg (keeps the lift without inventing tokens).
const VARIANT: Record<ModeCubeVariant, VariantStyle> = {
  pink:   { fill: 'bg-neo-pink',   ink: 'text-neo-navy',  chip: 'bg-neo-pink',   chipInk: 'text-neo-navy',  shadow: 'group-hover:shadow-hard-pink',   ring: 'focus-visible:ring-neo-pink' },
  cyan:   { fill: 'bg-neo-cyan',   ink: 'text-neo-navy',  chip: 'bg-neo-cyan',   chipInk: 'text-neo-navy',  shadow: 'group-hover:shadow-hard-cyan',   ring: 'focus-visible:ring-neo-cyan' },
  purple: { fill: 'bg-neo-purple', ink: 'text-neo-white', chip: 'bg-neo-purple', chipInk: 'text-neo-white', shadow: 'group-hover:shadow-hard-purple', ring: 'focus-visible:ring-neo-purple' },
  orange: { fill: 'bg-neo-orange', ink: 'text-neo-navy',  chip: 'bg-neo-orange', chipInk: 'text-neo-navy',  shadow: 'group-hover:shadow-hard-lg',     ring: 'focus-visible:ring-neo-orange' },
  lime:   { fill: 'bg-neo-lime',   ink: 'text-neo-navy',  chip: 'bg-neo-lime',   chipInk: 'text-neo-navy',  shadow: 'group-hover:shadow-hard-lime',   ring: 'focus-visible:ring-neo-lime' },
  blue:   { fill: 'bg-blue-500',   ink: 'text-neo-white', chip: 'bg-blue-500',   chipInk: 'text-neo-white', shadow: 'group-hover:shadow-hard-lg',     ring: 'focus-visible:ring-blue-400' },
};

function Badge({ label }: { label: string }) {
  return (
    <span className="absolute top-1.5 end-1.5 z-10 rounded-full border-2 border-black bg-neo-navy px-2 py-0.5 font-neo-display text-[0.6rem] font-black uppercase leading-none tracking-wide text-neo-white shadow-hard-sm">
      {label}
    </span>
  );
}

function LockOverlay({ message }: { message?: string }) {
  return (
    <span className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-neo bg-neo-navy/70 backdrop-grayscale">
      <Lock className="h-5 w-5 text-neo-white" strokeWidth={2.5} aria-hidden="true" />
      {message && <span className="px-2 text-center font-neo-body text-[0.65rem] text-neo-white">{message}</span>}
    </span>
  );
}

interface CubeProps {
  model: ModeCubeModel;
  index: number;
  anchor?: boolean;
  /** when false, the anchor is a wide single-row banner instead of a 2×2 block
      (used when there are too few sibling cubes to wrap a 2×2 anchor cleanly) */
  bigAnchor?: boolean;
}

function StartHerePill({ label, compact }: { label: string; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border-2 border-black bg-neo-navy font-neo-display font-black uppercase text-neo-lime',
        compact ? 'border px-1.5 py-0.5 text-[0.55rem] leading-none' : 'px-2 py-0.5 text-[0.65rem]',
      )}
    >
      {label}
    </span>
  );
}

function Cube({ model, index, anchor = false, bigAnchor = true }: CubeProps) {
  const { dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const v = VARIANT[model.variant];
  const locked = !!model.locked;
  const [imgFailed, setImgFailed] = useState(false);
  const hasArt = !!model.genIcon && !imgFailed;

  const handleClick = (e: React.MouseEvent) => {
    if (locked) {
      e.preventDefault();
      return;
    }
    model.onClick();
  };

  return (
    <Link
      href={locked ? '#' : model.href}
      onClick={handleClick}
      aria-disabled={locked || undefined}
      data-testid={anchor ? 'mode-cube-anchor' : 'mode-cube'}
      data-cube-key={model.key}
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
      className={cn(
        'cube-reveal group relative flex flex-col overflow-hidden rounded-neo border-neo-thick border-black shadow-hard transition-transform duration-150',
        // Physical neo-brutalist feedback. Lift on hover AND focus-visible so the
        // grid feels alive on TV/party screens (no pointer → focus is the only
        // signal) and for keyboard users. active = press the cube back in.
        'hover:-translate-x-0.5 hover:-translate-y-0.5 focus-visible:-translate-x-0.5 focus-visible:-translate-y-0.5',
        'active:translate-x-0 active:translate-y-0 active:shadow-hard-pressed',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        v.shadow, v.ring,
        anchor
          ? bigAnchor
            ? 'col-span-2 md:row-span-2 aspect-[16/9] sm:aspect-[2/1] md:aspect-square'
            : 'col-span-2 aspect-[16/9] sm:aspect-[5/2]' // wide banner: too few siblings for a 2×2
          : 'aspect-square',
        // base fill when there's no full-bleed art behind the content
        !hasArt && (anchor ? cn(v.fill, v.ink) : 'bg-neo-navy-light'),
        // With art: 1×1 cubes are square so the square sticker covers cleanly on
        // navy. The anchor is non-square on phones, so object-cover would crop the
        // glyph — instead it sits on its own variant colour and is `object-contain`d
        // below, so the colour-drenched bleed matches the art and nothing is cut.
        hasArt && (anchor ? v.fill : 'bg-neo-navy'),
        model.highlighted && 'ring-4 ring-neo-lime ring-offset-2 ring-offset-neo-navy',
        locked && 'cursor-not-allowed',
      )}
    >
      {hasArt && (
        <>
          <Image
            src={model.genIcon as string}
            alt=""
            fill
            sizes={anchor ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            onError={() => setImgFailed(true)}
            className={cn(
              anchor ? 'object-contain' : 'object-cover',
              'transition-transform duration-200 motion-safe:group-hover:scale-[1.06] motion-safe:group-focus-visible:scale-[1.06]',
            )}
          />
          {/* scrim so the title stays legible over the art */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-neo-navy via-neo-navy/65 to-transparent" />
        </>
      )}

      {/* idle diagonal light sweep — the homepage "glance". Now on EVERY cube
          (art or navy) so the whole bento shimmers, not just the anchor. Each
          cube is phase-shifted via animationDelay so they sweep organically
          instead of strobing in unison. Brighter/wider on the 2×2 anchor where
          there's room for it to read. CSS-gated on prefers-reduced-motion. */}
      <span
        aria-hidden="true"
        data-testid="cube-sheen"
        style={{ animationDelay: `${(index * 1.7).toFixed(2)}s` }}
        className={cn(
          'cube-sheen pointer-events-none absolute inset-y-0 -left-1/3 z-[1] bg-gradient-to-r from-transparent to-transparent',
          anchor ? 'w-1/2 via-white/60' : 'w-1/3 via-white/45',
        )}
      />

      {model.badge && <Badge label={model.badge} />}
      {locked && <LockOverlay message={model.lockedMessage} />}

      {/* ---- content layer ---- */}
      {anchor ? (
        <div className={cn('relative z-[1] flex h-full flex-col p-4 sm:p-5', hasArt ? 'justify-end text-neo-white' : v.ink)}>
          {!hasArt && (
            <span className={cn('mb-auto flex h-12 w-12 items-center justify-center rounded-neo border-2 border-black bg-neo-navy/15 sm:h-14 sm:w-14', v.ink)}>
              <model.Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.5} aria-hidden="true" />
            </span>
          )}
          <h3
            className={cn('font-neo-display text-xl font-black uppercase leading-none tracking-tight sm:text-2xl', hasArt ? 'text-neo-white' : '')}
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            {model.title}
          </h3>
          {model.highlighted && model.highlightLabel && <span className="mt-1.5">{<StartHerePill label={model.highlightLabel} />}</span>}
          {model.livePill && (
            // Physical "live" sticker — a lime chip with a pinging dot reads as
            // a tangible badge stuck on the card vs flat inline text.
            <span className="mt-2 inline-flex w-fit items-center gap-1.5 self-start rounded-full border-2 border-black bg-neo-lime px-2.5 py-1 font-neo-display text-[0.7rem] font-black uppercase tracking-wide text-neo-navy shadow-hard-sm sm:text-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-neo-navy opacity-70 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-neo-navy" />
              </span>
              {model.livePill}
            </span>
          )}
          <span className={cn('absolute bottom-3 end-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-black bg-neo-navy/25 transition-transform group-hover:translate-x-0.5', hasArt ? 'text-neo-white' : v.ink)}>
            <Arrow className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          </span>
        </div>
      ) : (
        <div className={cn('relative z-[1] flex h-full flex-col p-2.5', hasArt ? 'justify-end' : 'items-center justify-center gap-2 text-center')}>
          {!hasArt && (
            <span className={cn('flex h-11 w-11 items-center justify-center rounded-neo border-2 border-black shadow-hard-sm', v.chip, v.chipInk)}>
              <model.Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
            </span>
          )}
          <h3
            className={cn(
              'line-clamp-2 font-neo-display text-xs font-black uppercase leading-tight tracking-tight text-neo-white sm:text-sm',
              hasArt && 'text-start drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]',
            )}
            style={{ textWrap: 'balance' } as React.CSSProperties}
          >
            {model.title}
          </h3>
          {model.highlighted && model.highlightLabel && <StartHerePill label={model.highlightLabel} compact />}
        </div>
      )}
    </Link>
  );
}

export interface LandingModeCubesProps {
  models: ModeCubeModel[];
  /** the DailyChallengeBanner element — special-cased hero, never a cube */
  dailyNode?: React.ReactNode;
  extras?: ModeCubeModel[];
  sectionLabel: string;
  moreLabel?: string;
  moreHint?: string;
  collapseLabel?: string;
  t: (key: string) => string;
}

export function LandingModeCubes({
  models,
  dailyNode,
  extras = [],
  sectionLabel,
  moreLabel,
  moreHint,
  collapseLabel,
  t,
}: LandingModeCubesProps) {
  const anchor = models.find((m) => m.role === 'anchor') ?? models[0];
  const rest = models.filter((m) => m !== anchor);
  const hasExtras = extras.length > 0;
  // A 2×2 anchor only looks balanced with enough small cubes to wrap it; with a
  // sparse newcomer set (anchor + 1-2 cubes) it becomes a lopsided block, so the
  // anchor degrades to a full-width banner instead.
  const bigAnchor = rest.length >= 3;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 md:space-y-6 xl:max-w-6xl">
      {dailyNode && <div className="w-full">{dailyNode}</div>}

      <section aria-label={sectionLabel}>
        <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {anchor && <Cube model={anchor} index={0} anchor bigAnchor={bigAnchor} />}
          {rest.map((m, i) => (
            <Cube key={m.key} model={m} index={i + 1} />
          ))}
        </div>
      </section>

      {hasExtras && (
        <details
          data-testid="landing-cubes-more"
          className="group relative overflow-hidden rounded-neo border-neo-thick border-black bg-gradient-to-br from-neo-navy-light to-neo-navy shadow-hard transition-all open:shadow-hard-lg hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lime"
        >
          <summary className="flex cursor-pointer list-none select-none items-center justify-between gap-3 px-4 py-3 sm:py-4">
            <span className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-lime shadow-hard-sm group-hover:animate-neo-wobble sm:h-10 sm:w-10">
                <Sparkles className="h-5 w-5 text-neo-navy" strokeWidth={2.5} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-neo-display text-base font-black uppercase tracking-wide text-neo-white sm:text-lg">
                  {moreLabel ?? t('landing.moreGameModes') ?? 'More Game Modes'}
                </span>
                <span className="flex items-center gap-2 font-neo-body text-xs text-neo-white group-open:hidden sm:text-sm">
                  <span className="inline-flex h-5 min-w-[1.4rem] items-center justify-center rounded-full border border-black bg-neo-lime px-1.5 font-neo-display text-[0.65rem] font-black leading-none text-neo-navy">
                    +{extras.length}
                  </span>
                  {moreHint ?? t('landing.moreGameModesHint') ?? 'Tap to explore'}
                </span>
                <span className="hidden font-neo-body text-xs text-neo-white group-open:inline sm:text-sm">
                  {collapseLabel ?? t('common.collapse') ?? 'Hide'}
                </span>
              </span>
            </span>
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-neo-white/30 bg-neo-white/10 transition-transform duration-300 group-open:rotate-180 group-hover:border-neo-lime group-hover:bg-neo-lime/20">
              <ChevronDown className="h-5 w-5 text-neo-white" strokeWidth={2.5} />
            </span>
          </summary>
          <div className="grid auto-rows-fr grid-cols-2 gap-3 px-4 pb-4 pt-2 sm:gap-4 md:grid-cols-4">
            {extras.map((m, i) => (
              <Cube key={m.key} model={m} index={i} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default LandingModeCubes;
