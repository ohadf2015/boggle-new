'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, Check, Home, Pencil, Search, Disc3, Trophy, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import PracticeHubWelcome from '@/components/practice/PracticeHubWelcome';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { usePracticeProgress } from '@/components/practice/usePracticeProgress';
import PendingRoomBanner from '@/components/practice/PendingRoomBanner';
import PracticeHubAtmosphere from '@/components/practice/PracticeHubAtmosphere';
import PracticeHubHeader from '@/components/practice/PracticeHubHeader';
import { useFTUEGate } from '@/lib/onboarding/useFTUEGate';
import { useHideNavigation } from '@/contexts/NavigationContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

// Per-mode color identity — each game mode owns one of the brand families
// (classic = cyan / single-player, wordHunt = lime / primary, wheelRush =
// purple / brain-training). The hub wears these colors boldly so it reads as
// "our game", and the same mapping is mirrored in PracticeCompletePopup so the
// whole practice surface stays coherent.
interface ModeAccent {
  /** Card background wash — stronger for finished tiles (a claimed trophy). */
  tile: string;
  doneTile: string;
  /** Top accent bar — the mode-color signature stripe across each card. */
  bar: string;
  /** Icon chip on the hero thumbnail. */
  icon: string;
  /** Hover "go" arrow on incomplete tiles. */
  arrow: string;
  /** Next-up focus ring. */
  ring: string;
  /** RGB triple for the finished-tile color glow (layered over hard shadow). */
  glowRgb: string;
}

const MODE_ACCENT: Record<PracticeMode, ModeAccent> = {
  classic: {
    tile: 'bg-linear-to-br from-neo-navy-light to-neo-cyan/10',
    doneTile: 'bg-linear-to-br from-neo-cyan/20 to-neo-navy-light',
    bar: 'bg-neo-cyan', icon: 'bg-neo-cyan text-neo-black',
    arrow: 'bg-neo-cyan text-neo-black', ring: 'ring-neo-cyan',
    glowRgb: '0, 255, 255',
  },
  wordHunt: {
    tile: 'bg-linear-to-br from-neo-navy-light to-neo-lime/10',
    doneTile: 'bg-linear-to-br from-neo-lime/20 to-neo-navy-light',
    bar: 'bg-neo-lime', icon: 'bg-neo-lime text-neo-black',
    arrow: 'bg-neo-lime text-neo-black', ring: 'ring-neo-lime',
    glowRgb: '191, 255, 0',
  },
  wheelRush: {
    tile: 'bg-linear-to-br from-neo-navy-light to-neo-purple/10',
    doneTile: 'bg-linear-to-br from-neo-purple/20 to-neo-navy-light',
    bar: 'bg-neo-purple', icon: 'bg-neo-purple text-neo-white',
    arrow: 'bg-neo-purple text-neo-white', ring: 'ring-neo-purple',
    glowRgb: '139, 92, 246',
  },
};

// Hero thumbnails — same images as the tutorial help modal so visual
// language is consistent across hub → tutorial → in-game help.
const MODE_HERO: Record<PracticeMode, string> = {
  classic: '/practice/help/practice-help-classic.png',
  wordHunt: '/practice/help/practice-help-wordhunt.png',
  wheelRush: '/practice/help/practice-help-wheelrush.png',
};

// Per-mode glyph (lucide) — adds personality to the hero tiles without
// emoji. Matches the icons used in the tutorial + desktop welcome.
const MODE_ICON: Record<PracticeMode, LucideIcon> = {
  classic: Pencil,
  wordHunt: Search,
  wheelRush: Disc3,
};

interface Props {
  locale: string;
}

/**
 * Cozy practice hub. One mode per row, breathing accents, no badges or
 * counters. Tap → /practice/<mode> which shows the intro card.
 */
export default function PracticeHubClient({ locale }: Props) {
  const { t, language } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();
  const completed = usePracticeProgress(language);
  // First mode the player hasn't finished — the one we nudge them toward next.
  const nextMode = PRACTICE_MODES.find((m) => !completed.has(m)) ?? null;
  useFTUEGate(locale, `/${locale}/practice`);

  // The hub is a focused mode-select, not a marketing page: lock body scroll
  // (no page scroll) and drop the footer + bottom nav (the hub has its own Home
  // pill). Same in-game lever the sandboxes use; released on unmount so chrome
  // returns everywhere else.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  const handleTileTap = () => {
    playButtonClickSound();
    haptics.tap();
  };

  // Choreographed page-load: the mode tiles cascade up with a hard-shadow
  // "settle" so the hub reads as a deliberate stack of cards, not a static
  // list that just appears. clearProps hands transforms back to CSS so the
  // hover lift still works after the entrance. Gated on reduced-motion +
  // scoped via useGSAP so all tweens auto-kill on unmount.
  const reduceMotion = useShouldReduceMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    if (reduceMotion || !gridRef.current) return;
    const tiles = gridRef.current.children;
    if (tiles.length === 0) return;
    gsap.from(tiles, {
      opacity: 0,
      y: 28,
      scale: 0.92,
      rotateZ: (i: number) => (i % 2 === 0 ? -2.5 : 2.5),
      duration: 0.55,
      ease: 'back.out(1.5)',
      stagger: 0.09,
      delay: 0.12,
      clearProps: 'transform,opacity',
    });
  }, { scope: gridRef, dependencies: [reduceMotion] });

  return (
    <div className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto bg-linear-to-b from-neo-navy to-neo-navy-light px-4 sm:px-6 py-3">
      <PracticeHubAtmosphere />
      <div className="relative z-10 max-w-md md:max-w-3xl xl:max-w-5xl mx-auto">
        {/* Always-visible back to landing — restores hardware-back parity on
            desktop where there's no native gesture. */}
        <div className="mb-3 flex items-center justify-start">
          <Link
            href={`/${locale}`}
            data-testid="practice-hub-back"
            onClick={handleTileTap}
            aria-label={t('common.home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-neo-cream/30 text-neo-white hover:text-neo-white hover:border-neo-cream/60 text-xs font-neo-display font-bold uppercase tracking-wide transition-colors"
          >
            <Home className="w-3.5 h-3.5" aria-hidden />
            <span>{t('common.home')}</span>
          </Link>
        </div>
        <PendingRoomBanner locale={locale} />
        <PracticeHubHeader completedCount={completed.size} totalCount={PRACTICE_MODES.length} />

        {/* Brand-new players get a warm mascot hello pointing at the first
            tile. Retires the moment any mode is finished — a returning player
            doesn't need re-greeting. */}
        {completed.size === 0 && <PracticeHubWelcome />}

        {completed.size === PRACTICE_MODES.length && (
          <AdaptiveMotion.div
            data-testid="practice-all-complete"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            role="status"
            aria-live="polite"
            className="mb-6 flex flex-col items-center text-center"
          >
            {/* Celebratory trophy medallion — springs in so the "you did it"
                moment actually lands. The headline is plain text on the page
                background (no filled box) so it reads as a banner, never a
                button; the only tappable thing here is the real-game CTA below. */}
            <AdaptiveMotion.span
              aria-hidden
              initial={{ scale: 0, rotate: -25 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 13, delay: 0.12 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full border-3 border-neo-black bg-neo-yellow text-neo-black shadow-hard mb-3"
            >
              <Trophy className="w-8 h-8" strokeWidth={2.5} />
            </AdaptiveMotion.span>
            <p className="font-neo-display font-black text-2xl sm:text-3xl text-neo-white mb-1">
              {t('practiceHub.allCompleteTitle')}
            </p>
            <p className="font-neo-body text-sm text-neo-white/80 mb-4">
              {t('practiceHub.allCompleteBody')}
            </p>
            <Link
              href={`/${locale}`}
              onClick={handleTileTap}
              data-testid="practice-all-complete-cta"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-neo border-3 border-neo-black bg-neo-lime text-neo-black font-neo-display font-black text-base uppercase tracking-wide shadow-hard active:translate-y-px md:hover:-translate-y-0.5 md:hover:shadow-hard-lg transition-transform"
            >
              {t('practiceHub.goLive')}
            </Link>
          </AdaptiveMotion.div>
        )}

        <div ref={gridRef} className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-4">
          {PRACTICE_MODES.map((mode, idx) => {
            const isDone = completed.has(mode);
            const isNext = mode === nextMode;
            const ModeIcon = MODE_ICON[mode];
            const accent = MODE_ACCENT[mode];
            const baseClass =
              'group relative flex items-stretch gap-4 rounded-neo border-2 border-neo-black p-4 pt-5 shadow-hard overflow-hidden transition focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cozy';

            const inner = (
              <>
                {/* Mode-color signature stripe — the hub wears each mode's brand
                    color so it reads unmistakably as "our game". */}
                <span aria-hidden className={`absolute top-0 inset-x-0 h-1.5 ${accent.bar}`} />

                {/* Stage number — makes the 1 → 2 → 3 path through the
                    tutorial obvious. Flips to a gold trophy once it's done. */}
                <span
                  aria-hidden
                  className={`absolute top-2.5 start-1.5 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-neo-black font-neo-display font-black text-xs shadow-hard-sm ${
                    isDone ? 'bg-neo-yellow text-neo-black' : 'bg-neo-cream text-neo-navy'
                  }`}
                >
                  {isDone ? <Trophy className="w-3.5 h-3.5" strokeWidth={2.5} /> : idx + 1}
                </span>

                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 self-center rounded-neo border-2 border-neo-black overflow-hidden bg-neo-navy ${isDone ? 'shadow-hard-sm' : ''}`}>
                  <Image
                    src={MODE_HERO[mode]}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 96px, 80px"
                    className={`object-cover transition-transform duration-500 ${isDone ? '' : 'md:group-hover:scale-110'}`}
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-linear-to-t from-neo-black/45 via-transparent to-transparent"
                  />
                  <span
                    aria-hidden
                    className={`absolute bottom-1 start-1 inline-flex items-center justify-center w-6 h-6 rounded-md border-2 border-neo-black shadow-hard-sm ${accent.icon}`}
                  >
                    <ModeIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </span>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                  <h2 className="text-base sm:text-lg font-neo-display font-black text-neo-white truncate">
                    {t(`gameModes.${mode}.name`)}
                  </h2>
                  <p className="text-[0.72rem] sm:text-xs font-neo-body text-neo-white leading-snug line-clamp-2 pe-8">
                    {t(`gameModes.${mode}.description`)}
                  </p>
                </div>

                {/* Right-edge status. Completed → a proud gold trophy ribbon
                    (celebratory, not a dimmed "disabled" look). Next-up → a
                    gently bobbing "Start here" cue. Otherwise → the hover arrow
                    in the mode's own color. */}
                {isDone ? (
                  <span
                    data-testid={`practice-tile-trophy-${mode}`}
                    className="absolute top-1/2 end-2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full border-2 border-neo-black bg-neo-yellow text-neo-black font-neo-display font-black text-[0.6rem] uppercase tracking-wide shadow-hard-sm"
                  >
                    <Trophy className="w-3 h-3" strokeWidth={2.5} aria-hidden />
                    {t('practiceHub.completedBadge')}
                  </span>
                ) : isNext ? (
                  <AdaptiveMotion.span
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                    className={`absolute top-1/2 end-2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-1 rounded-full border-2 border-neo-black font-neo-display font-black text-[0.6rem] uppercase tracking-wide shadow-hard-sm ${accent.arrow}`}
                  >
                    {t('practiceHub.welcome.startHere')}
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" strokeWidth={3} aria-hidden />
                  </AdaptiveMotion.span>
                ) : (
                  <span
                    aria-hidden
                    className={`absolute top-1/2 end-2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-neo-black shadow-hard-sm transition-transform duration-300 md:opacity-0 md:translate-x-2 md:group-hover:opacity-100 md:group-hover:translate-x-0 ${accent.arrow}`}
                  >
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={3} />
                  </span>
                )}
              </>
            );

            // Finished stages still feel *earned* — full-saturation art, a gold
            // trophy ribbon, and a soft mode-color glow layered over the hard
            // shadow. They remain tappable so a player can REPLAY a finished
            // mode: an inert "done" tile that swallowed taps was a silent no-op
            // and a rage-click magnet (founder report). `?play=1` skips the
            // tutorial they've already seen and drops straight into the sandbox.
            if (isDone) {
              return (
                <Link
                  key={mode}
                  href={`/${locale}/practice/${mode}?play=1`}
                  onClick={handleTileTap}
                  data-testid={`practice-tile-${mode}`}
                  data-complete="true"
                  data-next="false"
                  aria-label={`${t(`gameModes.${mode}.name`)} — ${t('practiceHub.completedBadge')}`}
                  className={`${baseClass} ${accent.doneTile} active:translate-y-px md:hover:-translate-y-1`}
                  style={{ boxShadow: `2px 2px 0 #000, 0 0 18px rgba(${accent.glowRgb}, 0.28)` }}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <Link
                key={mode}
                href={`/${locale}/practice/${mode}`}
                onClick={handleTileTap}
                data-testid={`practice-tile-${mode}`}
                data-complete="false"
                data-next={isNext ? 'true' : 'false'}
                className={`${baseClass} ${accent.tile} active:translate-y-px md:hover:shadow-hard-lg md:hover:-translate-y-1 ${
                  isNext ? `ring-2 ${accent.ring} ring-offset-2 ring-offset-neo-navy` : ''
                }`}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
