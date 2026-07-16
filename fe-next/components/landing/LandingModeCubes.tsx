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

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, Lock, ChevronDown, Sparkles, TimerOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { CUBE_BLUR_DATA_URL, type ModeCubeModel, type ModeCubeVariant } from '@/lib/landing/modeMeta';
import { formatLiveShort } from '@/lib/landing/homeHubFormat';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';

interface VariantStyle {
  /** solid colour fill (anchor) */
  fill: string;
  /** ink on the solid fill */
  ink: string;
  /** small icon-block bg on navy cubes */
  chip: string;
  /** ink on the icon chip */
  chipInk: string;
  /** mode-tinted hard BORDER at rest — the per-mode "colour-coded modes" signal,
      folded INTO the edge instead of a detached coloured offset shadow (which read
      as a floating neon slab once the black frame was removed). Contained, hard-edged
      (no blur), quiet — does separation + colour-coding in one stroke. */
  border: string;
  /** coloured hard shadow on hover (same hue, kept for emphasis under the lift) */
  shadow: string;
  ring: string;
  /** mode-hue rgba fed to `--cube-glow` — the screen-blended ambient wash that
      tints the dead navy around the mascot (see `.cube-glow` in globals.css).
      Tuned per hue: bright accents (cyan/lime) stay lower so they don't blow out. */
  glow: string;
}

// Mirrors ModeCard's variant palette. Each mode's hue lives in a quiet tinted
// hard border at rest (contained colour-coding); the hard offset shadow is kept
// for HOVER only, as interaction lift — not resting clutter.
const VARIANT: Record<ModeCubeVariant, VariantStyle> = {
  pink:   { fill: 'bg-neo-pink',   ink: 'text-neo-navy',  chip: 'bg-neo-pink',   chipInk: 'text-neo-navy',  border: 'border-neo-pink/50',   shadow: 'group-hover:shadow-hard-pink',   ring: 'focus-visible:ring-neo-pink',   glow: 'rgba(255,20,147,0.42)' },
  cyan:   { fill: 'bg-neo-cyan',   ink: 'text-neo-navy',  chip: 'bg-neo-cyan',   chipInk: 'text-neo-navy',  border: 'border-neo-cyan/50',   shadow: 'group-hover:shadow-hard-cyan',   ring: 'focus-visible:ring-neo-cyan',   glow: 'rgba(0,255,255,0.34)' },
  purple: { fill: 'bg-neo-purple', ink: 'text-neo-white', chip: 'bg-neo-purple', chipInk: 'text-neo-white', border: 'border-neo-purple/50', shadow: 'group-hover:shadow-hard-purple', ring: 'focus-visible:ring-neo-purple', glow: 'rgba(139,92,246,0.5)' },
  orange: { fill: 'bg-neo-orange', ink: 'text-neo-navy',  chip: 'bg-neo-orange', chipInk: 'text-neo-navy',  border: 'border-neo-orange/50', shadow: 'group-hover:shadow-hard-orange', ring: 'focus-visible:ring-neo-orange', glow: 'rgba(255,107,53,0.42)' },
  lime:   { fill: 'bg-neo-lime',   ink: 'text-neo-navy',  chip: 'bg-neo-lime',   chipInk: 'text-neo-navy',  border: 'border-neo-lime/50',   shadow: 'group-hover:shadow-hard-lime',   ring: 'focus-visible:ring-neo-lime',   glow: 'rgba(191,255,0,0.36)' },
  blue:   { fill: 'bg-blue-500',   ink: 'text-neo-white', chip: 'bg-blue-500',   chipInk: 'text-neo-white', border: 'border-blue-400/50',   shadow: 'group-hover:shadow-hard-blue',   ring: 'focus-visible:ring-blue-400',   glow: 'rgba(59,130,246,0.42)' },
};

// RECOMMENDED modes keep the idle "glance" sheen — the high-energy competitive
// set (multiplayer arena, blast, party). Calm modes (practice, adventure, …) stay
// glare-free so the homepage has less going on at once (the anchor is always in).
const RECOMMENDED_SHEEN_KEYS = new Set(['arena', 'multiplayer', 'blast']);

// Badge wears the mode colour (not navy) so every flagged cube pops a chip of
// its own hue — a contained, on-brand splash of colour on the bento beyond the
// art itself. ADMIN previews stay quiet navy so they don't shout over public modes.
function Badge({ label, chip, chipInk }: { label: string; chip: string; chipInk: string }) {
  const quiet = label.toUpperCase() === 'ADMIN';
  return (
    <span
      className={cn(
        'absolute top-1.5 end-1.5 z-10 rounded-full border-2 border-black px-2 py-0.5 font-neo-display text-[0.6rem] font-black uppercase leading-none tracking-wide shadow-hard-sm',
        quiet ? 'bg-neo-navy text-neo-white' : cn(chip, chipInk),
      )}
    >
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
  /** `'calm'` cubes live in the quieter no-timer section — they drop the idle
      sheen and the loud mode-hue glow halo, and use a softer hover shadow so the
      section reads as a calmer "room" without leaving the neo-brutalist system. */
  tone?: 'fast' | 'calm';
  /** A lone trailing 1×1 cube on a 2-col mobile grid would sit alone at 50%
      width. Setting this spans it full-width instead (a tidy wide banner), then
      reverts to a square once its grid leaves 2-col — at `sm` for the calm
      auto-fit grid, at `md` for the fast bento's 4-col grid. */
  wideOrphan?: false | 'sm' | 'md';
  /** exp-homepage-click-feedback-v1: when true, a brief brightness drop persists
      ~350ms after click so players get confirmed visual feedback even when
      navigation starts immediately (CSS :active disappears on mouseup). */
  pressHighlight?: boolean;
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

// Full-literal class strings (Tailwind JIT can't see runtime-built ones): a lone
// trailing cube spans both mobile columns as a wide banner, then reverts to a
// square at the breakpoint where its grid stops being 2-col.
const WIDE_ORPHAN: Record<'sm' | 'md', string> = {
  sm: 'col-span-2 aspect-[5/2] sm:col-span-1 sm:aspect-square',
  md: 'col-span-2 aspect-[5/2] md:col-span-1 md:aspect-square',
};

function Cube({ model, index, anchor = false, bigAnchor = true, tone = 'fast', wideOrphan = false, pressHighlight = false }: CubeProps) {
  const { dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const v = VARIANT[model.variant];
  const calm = tone === 'calm';
  const showSheen = !calm && (anchor || RECOMMENDED_SHEEN_KEYS.has(model.key));
  const locked = !!model.locked;
  const [imgFailed, setImgFailed] = useState(false);
  const hasArt = !!model.genIcon && !imgFailed;
  const [pressed, setPressed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastClickMs = useRef<number>(0);
  useEffect(() => () => { if (pressTimer.current) clearTimeout(pressTimer.current); }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (locked) {
      e.preventDefault();
      return;
    }
    if (pressHighlight) {
      const now = Date.now();
      if (now - lastClickMs.current < 1500) {
        trackGrowthEvent('mode_card_rapid_reclick', { mode: model.key });
      }
      lastClickMs.current = now;
      setPressed(true);
      if (pressTimer.current) clearTimeout(pressTimer.current);
      pressTimer.current = setTimeout(() => setPressed(false), 350);
    }
    model.onClick();
  };

  return (
    <Link
      href={locked ? '#' : model.href}
      // Don't viewport-prefetch every game route on landing load — that pulls ~8
      // heavy route chunks into the initial parse window. Hover/focus prefetch still
      // fires, so navigation stays snappy. (HomeDailyHero already does this.)
      prefetch={false}
      onClick={handleClick}
      aria-disabled={locked || undefined}
      data-testid={anchor ? 'mode-cube-anchor' : 'mode-cube'}
      data-cube-key={model.key}
      style={{ animationDelay: `${Math.min(index, 8) * 0.05}s`, ['--cube-img-scale' as string]: model.imgScale ?? 1, ['--cube-glow' as string]: v.glow }}
      className={cn(
        // Colour-coding folded INTO a quiet 2px mode-tinted hard border (no blur) —
        // replaces both the loud 3px black frame AND the detached coloured offset
        // shadow, which read as a floating neon slab once the frame was gone. One
        // contained hard edge: separation + colour signal, far less on-screen noise.
        'cube-reveal group relative flex flex-col overflow-hidden rounded-neo border-2',
        v.border,
        // Physical 3D feedback. `.cube-tilt` lifts + tilts the cube back on hover AND
        // focus-visible (TV/party screens have no pointer → focus is the only signal;
        // keyboard users get it too) via the INDIVIDUAL transform props, which compose
        // with the `cube-rise` entrance animation that owns `transform` (a plain
        // `hover:-translate-*` here is silently clobbered by that filling animation).
        // active = press the cube back in (handled by `.cube-tilt:active`).
        'cube-tilt',
        'active:shadow-hard-pressed',
        'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
        // Calm cubes soften the hover to a gentle 1px hard shadow (the loud
        // coloured slab is competitive-only); fast cubes keep the mode-hued slab.
        calm ? 'group-hover:shadow-hard-sm' : v.shadow, v.ring,
        // A bit of glow on hover/focus: a soft mode-hued drop-shadow halo (a filter,
        // so it stacks on top of the hard box-shadow instead of replacing it). Reads
        // as electric-brand energy without softening the neo edge at rest. motion-safe
        // gated + transitioned to match the sibling image-scale pop (respects
        // prefers-reduced-motion). `--cube-glow` (the mode hue) is set on this Link.
        // Reserved for the energetic set — calm cubes stay glow-free so the no-timer
        // room reads quiet.
        'motion-safe:transition-[filter] motion-safe:duration-200',
        !calm && 'motion-safe:hover:drop-shadow-[0_0_16px_var(--cube-glow)] motion-safe:focus-visible:drop-shadow-[0_0_16px_var(--cube-glow)]',
        // exp-homepage-click-feedback-v1: brightness drop persists 350ms post-click
        // so players see confirmed feedback even when navigation starts immediately.
        pressHighlight && pressed && 'brightness-[0.72]',
        anchor
          ? bigAnchor
            ? 'col-span-2 md:row-span-2 aspect-[16/9] sm:aspect-[2/1] md:aspect-square'
            : 'col-span-2 aspect-[16/9] sm:aspect-[5/2]' // wide banner: too few siblings for a 2×2
          : wideOrphan
          ? WIDE_ORPHAN[wideOrphan] // lone trailing cube → full-width banner, not a half-width orphan
          : 'aspect-square',
        // base fill when there's no full-bleed art behind the content
        !hasArt && (anchor ? cn(v.fill, v.ink) : 'bg-neo-navy-light'),
        // With art: EVERY cube sits on the same dark navy so the colour comes from
        // the mascot art, not the tile (the homepage brief — dark base, image is the
        // colour). Both 1×1 cubes AND the anchor use `object-cover` so the art fills
        // edge-to-edge (no letterbox bars): the anchor's arena sticker is LANDSCAPE
        // (wider than tall) so cover crops only a sliver, and the baked navy bg is
        // seamless. Per-asset `--cube-img-scale` then grows the small-framed mascots
        // (see modeMeta.imgScale) so every tile reads full-bleed, not a tiny floater.
        hasArt && 'bg-neo-navy',
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
            // The anchor (arena) is above the fold → eager-preload it; the rest of
            // the bento stays lazy. A shared navy LQIP blurs up seamlessly (same
            // navy as the tile) so cubes never pop in from blank.
            priority={anchor}
            placeholder="blur"
            blurDataURL={CUBE_BLUR_DATA_URL}
            sizes={anchor ? '(max-width: 768px) 100vw, 50vw' : '(max-width: 768px) 50vw, 25vw'}
            onError={() => setImgFailed(true)}
            className={cn(
              // cover everywhere now (anchor included) → fills the tile, no navy bars.
              'object-cover',
              // per-asset rest scale (var set on the Link) fills small mascots; hover
              // adds a further 6% pop. calc keeps the two multiplicative.
              'scale-[var(--cube-img-scale)] transition-transform duration-200',
              'motion-safe:group-hover:scale-[calc(var(--cube-img-scale)*1.06)] motion-safe:group-focus-visible:scale-[calc(var(--cube-img-scale)*1.06)]',
            )}
          />
          {/* per-mode ambient glow — tints the dead navy margin with the mode hue
              (screen-blended, subtle). Sits above the art, below sheen + content. */}
          <span
            aria-hidden="true"
            data-testid="cube-glow"
            style={{ ['--cube-glow' as string]: v.glow }}
            className="cube-glow pointer-events-none absolute inset-0 z-[1]"
          />
          {/* scrim so the title stays legible over the art */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-neo-navy via-neo-navy/65 to-transparent" />
        </>
      )}

      {/* idle diagonal light sweep — the homepage "glance". RESERVED for the
          recommended/high-energy set (anchor + blast/party) so the bento has less
          glare overall; the calm modes stay still. Phase-shifted via animationDelay
          so the recommended cubes sweep organically, not in unison. CSS-gated on
          prefers-reduced-motion. */}
      {showSheen && (
        <span
          aria-hidden="true"
          data-testid="cube-sheen"
          style={{ animationDelay: `${(index * 1.7).toFixed(2)}s` }}
          className={cn(
            'cube-sheen pointer-events-none absolute inset-y-0 -left-1/3 z-[1] bg-gradient-to-r from-transparent to-transparent',
            anchor ? 'w-1/2 via-white/55' : 'w-1/3 via-white/40',
          )}
        />
      )}

      {model.badge && <Badge label={model.badge} chip={v.chip} chipInk={v.chipInk} />}
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
  /** the calm / no-timer set (crossword, word craft, sealed bid, connections).
      Rendered in a distinct, quieter "take your time" room below the energetic
      bento. Empty/absent ⇒ the section is not rendered at all (no empty room). */
  calmModels?: ModeCubeModel[];
  /** heading for the calm section (e.g. "Take Your Time") */
  calmLabel?: string;
  /** sub-copy under the calm heading (e.g. "Relaxed puzzles at your own pace") */
  calmHint?: string;
  sectionLabel: string;
  moreLabel?: string;
  moreHint?: string;
  collapseLabel?: string;
  t: (key: string) => string;
  /** `'hub'` (mobile Home Hub) shows a VISIBLE section header + live-online pill
      above the grid; `'bento'` (default, desktop landing) keeps the header as an
      invisible aria-label only. */
  layout?: 'bento' | 'hub';
  /** live player count — drives the hub header's "{n} online" pill */
  liveCount?: number;
}

export function LandingModeCubes({
  models,
  dailyNode,
  extras = [],
  calmModels = [],
  calmLabel,
  calmHint,
  sectionLabel,
  moreLabel,
  moreHint,
  collapseLabel,
  t,
  layout = 'bento',
  liveCount,
}: LandingModeCubesProps) {
  const { variant: clickFbVariant, trackExposure: trackClickFbExposure } = useExperiment('exp-homepage-click-feedback-v1');
  useEffect(() => { trackClickFbExposure(); }, [trackClickFbExposure]);
  const pressHighlight = clickFbVariant === 'click-feedback';

  const anchor = models.find((m) => m.role === 'anchor') ?? models[0];
  const rest = models.filter((m) => m !== anchor);
  const hasExtras = extras.length > 0;
  const hasCalm = calmModels.length > 0;
  // A 2×2 anchor only looks balanced with enough small cubes to wrap it; with a
  // sparse newcomer set (anchor + 1-2 cubes) it becomes a lopsided block, so the
  // anchor degrades to a full-width banner instead.
  const bigAnchor = rest.length >= 3;

  return (
    // `.cube-deck` sets the shared `perspective` so every child `.cube-tilt`
    // (cubes + daily banner) tilts with real 3D depth on hover.
    <div className="cube-deck mx-auto w-full max-w-5xl space-y-5 md:space-y-6 xl:max-w-6xl">
      {dailyNode && (
        // Centred + width-capped so the daily reads as a tidy banner (content + mascot
        // sit close) instead of a full-width strip with a dead navy gap in the middle.
        <div className="cube-tilt mx-auto w-full max-w-3xl rounded-neo">{dailyNode}</div>
      )}

      <section aria-label={sectionLabel}>
        {layout === 'hub' && (
          <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
            <h3 className="whitespace-nowrap font-neo-display text-lg font-black uppercase tracking-wide text-neo-cream">
              {sectionLabel}
            </h3>
            {typeof liveCount === 'number' && liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 font-neo-display text-xs font-bold text-neo-lime">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-neo-lime opacity-65 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-neo-lime" />
                </span>
                {formatLiveShort(liveCount)} {t('landing.home.online')}
              </span>
            )}
          </div>
        )}
        <div className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {anchor && <Cube model={anchor} index={0} anchor bigAnchor={bigAnchor} pressHighlight={pressHighlight} />}
          {rest.map((m, i) => (
            // Odd rest ⇒ the last cube would sit alone at 50% on the 2-col mobile
            // grid; span it full-width (reverts to a square once the bento goes
            // 4-col at md). The anchor already fills its own row so it's exempt.
            <Cube
              key={m.key}
              model={m}
              index={i + 1}
              wideOrphan={rest.length % 2 === 1 && i === rest.length - 1 ? 'md' : false}
              pressHighlight={pressHighlight}
            />
          ))}
        </div>
      </section>

      {/* ===== CALM / NO-TIMER ROOM =====
          A quieter, deliberately separate "world" for the untimed puzzles
          (crossword, word craft, sealed bid, connections). Stays inside the
          neo-brutalist system — hard border, navy, Fredoka — but dials the energy
          down: a defined cool-tinted panel (vs the bento's bare-navy grid), a
          TimerOff-icon header that names the promise, roomier centred tiles, and
          glow/sheen-free cubes (tone="calm"). Sized to read intentional from 2
          tiles (public: word craft + connections) up to 4 (admin adds
          crossword + sealed bid) — no anchor hero, all peers. */}
      {hasCalm && (
        <section
          data-testid="landing-cubes-calm"
          aria-label={calmLabel ?? t('landing.calmSectionTitle')}
          className="rounded-neo border-2 border-neo-cyan/25 bg-neo-navy-light/40 p-4 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2.5 px-0.5 sm:mb-4">
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-black bg-neo-cyan shadow-hard-sm sm:h-10 sm:w-10"
            >
              <TimerOff className="h-5 w-5 text-neo-navy" strokeWidth={2.5} />
            </span>
            <div className="flex min-w-0 flex-col">
              <h3 className="font-neo-display text-lg font-black uppercase leading-none tracking-wide text-neo-cyan">
                {calmLabel ?? t('landing.calmSectionTitle')}
              </h3>
              <span className="mt-0.5 font-neo-body text-xs text-neo-cream/85 sm:text-sm">
                {calmHint ?? t('landing.calmSectionSubtitle')}
              </span>
            </div>
          </div>
          {/* auto-fit + capped tile width keeps 2 tiles from ballooning and stays
              tidy at 3/4; centred so a short set never hugs the start edge. */}
          <div className="grid auto-rows-fr grid-cols-2 justify-center gap-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(150px,190px))]">
            {calmModels.map((m, i) => (
              // Odd calm set ⇒ span the lone trailing tile full-width on the
              // 2-col mobile grid (reverts to a square once it auto-fits at sm).
              <Cube
                key={m.key}
                model={m}
                index={i}
                tone="calm"
                wideOrphan={calmModels.length % 2 === 1 && i === calmModels.length - 1 ? 'sm' : false}
                pressHighlight={pressHighlight}
              />
            ))}
          </div>
        </section>
      )}

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
              <Cube key={m.key} model={m} index={i} pressHighlight={pressHighlight} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default LandingModeCubes;
