'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { cn } from '@/lib/utils';
import { carouselPage, carouselPages } from './classPaging';

export interface ClassCarouselSlide {
  key: string;
  node: ReactNode;
}

export interface ClassCarouselProps {
  slides: ClassCarouselSlide[];
  /** Cards visible at once: 1 phone, 2 tablet, 3 desktop. */
  perView: number;
  label?: string;
  /** After the cards (the "new class" seat); not a snap stop and not counted as a page. */
  trailing?: ReactNode;
  /** Shares one row with the switcher, above the cards (the free-class meter). */
  header?: ReactNode;
  className?: string;
}

const STEP =
  'flex size-10 shrink-0 items-center justify-center rounded-neo border-2 border-neo-cream/60 bg-neo-navy text-neo-cream transition-colors hover:bg-neo-cream/10 active:translate-y-px focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime disabled:cursor-not-allowed disabled:opacity-40';

/**
 * Class cards in a native scroll-snap track: swipe, trackpad and keyboard
 * scrolling come from the browser, which also flips direction in RTL. The
 * arrows only ask a card to scroll to the start edge (`scrollIntoView`), so
 * no scrollLeft sign maths. Arrows and the position dots appear only when
 * there is more than one screenful.
 */
export function ClassCarousel({ slides, perView, label, trailing, header, className }: ClassCarouselProps) {
  const { t } = useLanguage();
  const reduced = useEduReducedMotion();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [page, setPage] = useState(0);

  const count = slides.length;
  const pages = carouselPages(count, perView);
  const current = Math.min(page, pages - 1);

  const syncFromScroll = useCallback(() => {
    const track = trackRef.current;
    const first = slideRefs.current[0];
    const second = slideRefs.current[1];
    if (!track || !first) return;
    // Offsets are mirrored in RTL; only the distance between cards matters.
    const stride = second ? Math.abs(second.offsetLeft - first.offsetLeft) : 0;
    const offset = Math.abs(track.scrollLeft);
    setPage(
      carouselPage({
        firstIndex: stride > 0 ? Math.round(offset / stride) : 0,
        atEnd: track.scrollWidth > track.clientWidth && offset + track.clientWidth >= track.scrollWidth - 2,
        perView,
        count,
      }),
    );
  }, [perView, count]);

  // Resizing changes perView and the snap stops; settle on the right page again.
  useEffect(() => {
    syncFromScroll();
  }, [syncFromScroll]);

  const goTo = (target: number) => {
    const next = Math.min(Math.max(0, target), pages - 1);
    slideRefs.current[next * perView]?.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    });
    setPage(next);
  };

  return (
    <div className={cn('space-y-2 sm:space-y-3', className)}>
      <div data-testid="class-carousel-bar" className="flex items-center gap-3 [&:has(>div:empty):not(:has(>nav))]:hidden">
        <div className="min-w-0 flex-1 empty:hidden">{header}</div>
        {pages > 1 ? (
          <nav
            data-testid="class-carousel-nav"
            aria-label={t('academy.classes.pagerLabel', 'Classes pages')}
            className="flex shrink-0 items-center gap-2"
          >
            <button
              type="button"
              data-testid="class-carousel-prev"
              onClick={() => goTo(current - 1)}
              disabled={current <= 0}
              aria-label={t('academy.classes.prevPage', 'Previous classes')}
              title={t('academy.classes.prevPage', 'Previous classes')}
              className={STEP}
            >
              <DirectionalIcon icon={ChevronLeft} className="size-5" />
            </button>
            <div className="flex min-w-14 flex-col items-center gap-1">
              <span
                data-testid="class-carousel-status"
                aria-live="polite"
                className="whitespace-nowrap text-center font-neo-display text-sm font-bold text-neo-cream tabular-nums"
              >
                {t('academy.classes.pageOf', '{{page}} of {{pages}}', { page: current + 1, pages })}
              </span>
              <span aria-hidden="true" className="flex items-center gap-1.5">
                {Array.from({ length: pages }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all motion-reduce:transition-none',
                      i === current ? 'w-4 bg-neo-cream' : 'w-1.5 bg-neo-cream/35',
                    )}
                  />
                ))}
              </span>
            </div>
            <button
              type="button"
              data-testid="class-carousel-next"
              onClick={() => goTo(current + 1)}
              disabled={current >= pages - 1}
              aria-label={t('academy.classes.nextPage', 'More classes')}
              title={t('academy.classes.nextPage', 'More classes')}
              className={STEP}
            >
              <DirectionalIcon icon={ChevronRight} className="size-5" />
            </button>
          </nav>
        ) : null}
      </div>
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        data-testid="class-carousel-track"
        onScroll={syncFromScroll}
        // Padding keeps the cards' hard shadows and hover lift from being clipped by the scroller.
        className={cn(
          '-mx-1.5 flex snap-x snap-mandatory items-start gap-[var(--gap)] overflow-x-auto overscroll-x-contain px-1.5 pb-3 pt-1 [--gap:1rem] [scroll-padding-inline:0.375rem] [scrollbar-width:none] lg:[--gap:1.5rem] [&::-webkit-scrollbar]:hidden',
          'focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan',
          !reduced && 'scroll-smooth',
        )}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.key}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={t('academy.classes.pageOf', '{{page}} of {{pages}}', { page: i + 1, pages: count })}
            className="shrink-0 snap-start"
            style={{ flexBasis: `calc((100% - ${perView - 1} * var(--gap)) / ${perView})`, minWidth: 0 }}
          >
            {slide.node}
          </div>
        ))}
        {trailing}
      </div>

    </div>
  );
}

export default ClassCarousel;
