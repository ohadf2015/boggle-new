'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Move, TrendingUp, Compass, Target, Route, Disc, Hand, Plus, type LucideIcon } from 'lucide-react';
import { m, type PanInfo } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import { tutorialTipKeys, type PracticeMode } from '@/lib/practice/practiceTutorialSteps';
import PracticeTutorialArt from './PracticeTutorialArt';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

// Auto-advance pacing. WCAG 2.2.2 requires either a pause control or auto-stop
// within 5s — we honor by stopping on first user interaction. Reduced-motion
// disables autoplay entirely.
const AUTOPLAY_INTERVAL_MS = 4500;

const ACCENT_RGB: Record<PracticeMode, string> = {
  classic: '0, 255, 255',
  wordHunt: '191, 255, 0',
  wheelRush: '139, 92, 246',
};

const ACCENT_TEXT: Record<PracticeMode, string> = {
  classic: 'text-neo-cyan',
  wordHunt: 'text-neo-lime',
  wheelRush: 'text-neo-purple',
};

const ACCENT_BG: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan',
  wordHunt: 'bg-neo-lime',
  wheelRush: 'bg-neo-purple',
};

const TIP_ICONS: Record<PracticeMode, [LucideIcon, LucideIcon, LucideIcon]> = {
  classic: [Move, TrendingUp, Compass],
  wordHunt: [Target, Move, Route],
  wheelRush: [Disc, Hand, Plus],
};

export interface PracticeTutorialSheetProps {
  mode: PracticeMode;
  t: TFunction;
  onContinue: () => void;
  /**
   * Optional skip handler — bypasses the tutorial and jumps straight to play.
   * If omitted, the skip button calls onContinue (so it stays functional but
   * routes wherever the parent decides).
   */
  onSkip?: () => void;
  /** Locale for back-to-hub link. Defaults to /practice (locale-less). */
  locale?: string;
  /** RTL flag for swipe direction (defaults LTR). */
  isRTL?: boolean;
}

/**
 * Practice tutorial sheet — image-led carousel.
 *
 * 3 swipeable slides per mode (one per tip). Each slide pairs the mode hero
 * illustration with a localized caption, so the language adapts via t() while
 * the visual story stays consistent. Replaces the prior 3-stacked-text-boxes
 * layout that felt cramped on desktop.
 *
 * The full tip text is rendered in the DOM for every slide (active + inactive)
 * so screen readers and tests can find all three captions even though only one
 * is visually active.
 */
const PracticeTutorialSheet: React.FC<PracticeTutorialSheetProps> = ({ mode, t, onContinue, onSkip, locale, isRTL = false }) => {
  const { playButtonClickSound } = useSoundEffects();
  const tipKeys = tutorialTipKeys(mode);
  const icons = TIP_ICONS[mode];
  const [activeSlide, setActiveSlide] = useState(0);
  // Stops autoplay forever once the user has touched the carousel. Single-shot
  // ref (not state) — we never want to re-render purely to mark this.
  const interactedRef = useRef(false);

  const handleContinue = () => {
    playButtonClickSound();
    haptics.tap();
    onContinue();
  };
  const handleSkip = () => {
    playButtonClickSound();
    haptics.tap();
    (onSkip ?? onContinue)();
  };
  const goToSlide = useCallback((idx: number, opts: { user?: boolean } = {}) => {
    if (opts.user) {
      interactedRef.current = true;
      playButtonClickSound();
      haptics.tap();
    }
    setActiveSlide(Math.max(0, Math.min(tipKeys.length - 1, idx)));
  }, [playButtonClickSound, tipKeys.length]);

  const handleDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const offset = info.offset.x;
    const v = info.velocity.x;
    const next = isRTL ? (offset > threshold || v > 500) : (offset < -threshold || v < -500);
    const prev = isRTL ? (offset < -threshold || v < -500) : (offset > threshold || v > 500);
    if (next && activeSlide < tipKeys.length - 1) goToSlide(activeSlide + 1, { user: true });
    else if (prev && activeSlide > 0) goToSlide(activeSlide - 1, { user: true });
  }, [activeSlide, goToSlide, isRTL, tipKeys.length]);

  // Auto-advance until user interacts (or reduced-motion). Loops once through
  // all slides and stops — meets WCAG 2.2.2 without a pause control.
  useEffect(() => {
    if (interactedRef.current) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    if (activeSlide >= tipKeys.length - 1) return; // stop at last slide
    const id = window.setTimeout(() => {
      if (interactedRef.current) return;
      setActiveSlide((prev) => Math.min(prev + 1, tipKeys.length - 1));
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [activeSlide, tipKeys.length]);

  const backHref = locale ? `/${locale}/practice` : '/practice';

  return (
    <div
      data-testid="practice-tutorial-sheet"
      className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light flex items-center justify-center px-4 sm:px-6 py-5 sm:py-8"
    >
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md md:max-w-2xl flex flex-col gap-4"
      >
        {/* Top bar — back arrow + tutorial label + skip */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            data-testid="practice-tutorial-back"
            aria-label={t('common.back')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-neo-cream/30 text-neo-white hover:text-neo-white hover:border-neo-cream/60 text-xs font-neo-display font-bold uppercase tracking-wide transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden />
            <span>{t('common.back')}</span>
          </Link>
          <p className="text-[0.65rem] font-neo-body text-neo-white uppercase tracking-wider font-bold">
            {t('gameModes.tutorial.title')}
          </p>
          <button
            type="button"
            onClick={handleSkip}
            className="py-2 px-3 text-sm bg-neo-cream/10 rounded-full border-2 border-neo-cream/30 hover:bg-neo-cream/20 transition text-neo-white font-neo-display font-bold"
          >
            {t('gameModes.intro.skip')}
          </button>
        </div>

        {/* Title row */}
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-neo-display font-bold text-neo-white">
            {t(`gameModes.${mode}.name`)}
          </h2>
          <p className="text-sm sm:text-base font-neo-body text-neo-white italic mt-1">
            {t(`gameModes.${mode}.intro.greet`)}
          </p>
        </div>

        {/* Image carousel — swipeable slides, one tip per slide.
            All 3 tip captions stay rendered (visually-hidden when inactive)
            so screen readers + tests can find every tip in one pass. */}
        <div
          data-testid="practice-tutorial-carousel"
          className="relative w-full overflow-hidden rounded-neo border-2 border-neo-black shadow-hard"
        >
          <div className="relative aspect-[4/3] sm:aspect-video w-full">
            <m.div
              className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
            >
              {/* All 3 slides live in the DOM so every caption is discoverable
                  to screen readers + crawlers. Inactive slides are visually
                  hidden via opacity + aria-hidden but still queryable. */}
              {tipKeys.map((tipKey, idx) => {
                const Icon = icons[idx];
                const isActive = idx === activeSlide;
                return (
                  <div
                    key={tipKey}
                    role="group"
                    aria-roledescription="slide"
                    aria-hidden={!isActive}
                    aria-label={`${idx + 1} / ${tipKeys.length}`}
                    className={`absolute inset-0 transition-opacity duration-300 ${isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'}`}
                  >
                    <PracticeTutorialArt mode={mode} idx={idx} />
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-neo-navy via-neo-navy/85 to-transparent"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end gap-3">
                      <span
                        className={`shrink-0 w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center bg-neo-navy ${ACCENT_TEXT[mode]}`}
                        style={{ boxShadow: `2px 2px 0 rgba(${ACCENT_RGB[mode]}, 0.45)` }}
                        aria-hidden
                      >
                        <Icon className="w-5 h-5" strokeWidth={2.5} />
                      </span>
                      <p className="flex-1 text-base sm:text-lg font-neo-display font-bold text-neo-white leading-tight line-clamp-2 max-h-[3.5rem]">
                        {t(tipKey)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </m.div>
            {/* Step ribbon */}
            <div className="absolute top-3 end-3 px-3 py-1 rounded-full bg-neo-navy border-2 border-neo-cream/60 text-neo-white text-sm font-neo-display font-bold">
              {activeSlide + 1} / {tipKeys.length}
            </div>
            {/* Prev / next chevrons (desktop affordance) */}
            <button
              type="button"
              onClick={() => goToSlide(activeSlide - 1, { user: true })}
              disabled={activeSlide === 0}
              aria-label={t('howToPlay.back')}
              className="hidden md:flex absolute start-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-neo-navy/80 border-2 border-neo-black text-neo-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neo-navy"
            >
              <ChevronLeft className="w-5 h-5 rtl:rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goToSlide(activeSlide + 1, { user: true })}
              disabled={activeSlide === tipKeys.length - 1}
              aria-label={t('howToPlay.nextStep')}
              className="hidden md:flex absolute end-2 top-1/2 -translate-y-1/2 w-9 h-9 items-center justify-center rounded-full bg-neo-navy/80 border-2 border-neo-black text-neo-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neo-navy"
            >
              <ChevronRight className="w-5 h-5 rtl:rotate-180" aria-hidden />
            </button>
          </div>

          {/* Tip dots */}
          <div className="flex items-center justify-center gap-2 py-3 bg-neo-navy/80 border-t-2 border-neo-black">
            {tipKeys.map((tipKey, idx) => {
              const isActive = idx === activeSlide;
              return (
                <button
                  key={tipKey}
                  type="button"
                  onClick={() => goToSlide(idx, { user: true })}
                  aria-label={`${idx + 1} / ${tipKeys.length}`}
                  aria-current={isActive ? 'step' : undefined}
                  className={`h-2.5 rounded-full transition-all duration-300 ${isActive ? `w-8 ${ACCENT_BG[mode]}` : 'w-2.5 bg-neo-cream/25 hover:bg-neo-cream/45'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="flex flex-col items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full md:max-w-sm px-8 py-3 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-neo-display font-bold shadow-hard transition-transform active:translate-y-px active:shadow-hard-pressed inline-flex items-center justify-center gap-2"
          >
            <span>{t('gameModes.tutorial.cta')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" aria-hidden />
          </button>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
};

export default PracticeTutorialSheet;
