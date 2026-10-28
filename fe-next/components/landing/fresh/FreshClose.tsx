'use client';

import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';
import { FreshPlayLink } from './FreshPlayLink';
import { useFreshPlay } from './freshPlayBridge';
import s from './FreshMotion.module.css';

interface FreshCloseProps {
  /** URL locale from HomepageContentSection: the PLAY href is built from it. */
  locale: string;
  /** Explicit override. On the page, quick play arrives through freshPlayBridge. */
  onPlay?: () => void;
}

/**
 * Section 7, the finale: the page's last beat and its actual ending.
 *
 * Rendered LAST by HomepageContentSection (page.tsx renders that component
 * last), so the only thing below this band is the site footer. Four rounds of
 * critics read anything after the closing PLAY as "the page doesn't know when
 * to stop"; the How to Play / FAQ reference now sits above it instead
 * (fresh.shell.ending.test).
 *
 * One beat: a full-bleed lime band, the waving mascot peeking over its top
 * edge (the old "see you on the board" sign-off, merged in), one headline, one
 * line, one PLAY. The band meets the footer's black rule directly: no tab-bar
 * reserve pads it, because fresh visitors get no tab bar on the homepage.
 *
 * - PLAY is a real `<a href="/{locale}/multiplayer">` (server HTML, crawlers,
 *   no JS). LandingView publishes onStartOnboarding through freshPlayBridge;
 *   when it arrives only the click handler changes, never the markup.
 * - Fresh visitors only: `data-home-only="fresh"` is hidden for returning
 *   visitors by the homepage tree CSS (../homeTree), like the fresh tree.
 * - useLanguageSafe: HomepageContentSection is a server component that tests
 *   also render standalone, outside any LanguageProvider.
 * - The mascot loads eagerly at low priority (22KB): a lazy image below the
 *   fold stays a blank hole in any capture or reader that never scrolls to it.
 * - Fun is CSS only and motion-safe: the mascot bobs (FreshMotion .bob), hops
 *   when the band is hovered, and PLAY lifts on hover and sinks on press.
 */
export function FreshClose({ locale, onPlay }: FreshCloseProps) {
  const { t } = useLanguageSafe();
  const bridged = useFreshPlay();

  return (
    <div data-home-only="fresh" className="mt-16 md:mt-20">
      <section
        data-fresh-section="close"
        aria-labelledby="fresh-close-title"
        className="group/finale relative border-t-3 border-neo-black bg-neo-lime"
      >
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-end gap-6 px-4 pb-14 pt-24 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10 md:pb-16 md:pt-24 lg:px-8">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 end-4 block h-32 w-32 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover/finale:-translate-y-2 md:-top-28 md:end-10 md:h-44 md:w-44"
          >
            <Image
              src="/mascot/hello-nobg.webp"
              alt=""
              width={176}
              height={176}
              loading="eager"
              fetchPriority="low"
              className={cn('h-full w-full drop-shadow-[4px_4px_0_rgb(0_0_0)]', s.bob)}
            />
          </span>
          <div className="flex min-w-0 flex-col gap-3">
            <h2
              id="fresh-close-title"
              className="max-w-[16ch] font-neo-poster text-[2rem] font-extrabold leading-[1.04] tracking-[-0.015em] text-neo-black text-balance [overflow-wrap:anywhere] sm:text-5xl md:text-6xl"
            >
              {t('homeFresh.close.title')}
            </h2>
            <p className="max-w-[40ch] font-neo-body text-base font-medium text-neo-black/80 md:text-lg">
              {t('homeFresh.close.line')}
            </p>
          </div>
          <FreshPlayLink
            onPlay={onPlay ?? bridged}
            cta="bottom_cta"
            locale={locale}
            className={cn(
              'inline-flex min-h-14 items-center justify-center gap-3 justify-self-start rounded-neo-lg border-3 border-neo-black bg-neo-navy px-8 py-4',
              'font-neo-poster text-lg font-extrabold uppercase tracking-[0.02em] text-neo-lime shadow-hard-xl active:shadow-hard-pressed md:text-xl',
              'motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-[2px]',
              'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-black'
            )}
          >
            {t('homeFresh.close.play')}
            <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
          </FreshPlayLink>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(var(--neo-navy)_1.5px,transparent_1.5px)] [background-size:14px_14px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        />
      </section>
    </div>
  );
}
