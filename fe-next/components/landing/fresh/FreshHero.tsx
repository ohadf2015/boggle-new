'use client';

/**
 * Section 1: the first viewport (owner: piece B).
 *
 * One loud idea: "this is a word game, try it right here". The page's ONLY h1
 * (kicker carries "multiplayer word game" for crawlers), a traceable board, one
 * lime PLAY and a quiet "I have an account".
 *
 * - PLAY is a FreshPlayLink: a real <a href="/{locale}/multiplayer"> in server
 *   HTML; a mounted `onPlay` only upgrades the click (PageClient opens
 *   OnboardingFlow straight into quick play). The element never swaps: no CLS.
 * - Layout: 390 stacks copy, board, actions with PLAY above the cookie banner;
 *   ≥md puts copy + actions on the start side and the board on the end side.
 * - No JS animation library; CSS motion only, behind prefers-reduced-motion.
 */
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { FreshPlayLink } from './FreshPlayLink';
import { HeroGrid } from './HeroGrid';

// Same chunk the site Header already lazy-loads for its Sign in button.
const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export interface FreshHeroProps {
  /** Opens OnboardingFlow in quick-play (PageClient). Absent on the server. */
  onPlay?: () => void;
}

export function FreshHero({ onPlay }: FreshHeroProps) {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const [found, setFound] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const handleFound = useCallback(() => setFound(true), []);

  return (
    <section
      data-fresh-section="hero"
      aria-labelledby="fresh-hero-title"
      className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-x-10 gap-y-5 lg:gap-x-16 px-4 pb-12 pt-5 sm:px-6 sm:pt-10 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:gap-y-8 md:pb-24 md:pt-16 lg:px-8"
    >
      <div className="flex flex-col items-start gap-3 md:col-start-1 md:row-start-1 md:self-end md:gap-5">
        <h1
          id="fresh-hero-title"
          className="flex flex-col gap-2 font-neo-display font-bold text-neo-cream md:gap-3"
        >
          <span className="font-neo-body text-sm font-bold uppercase tracking-[0.14em] text-neo-lime md:text-base">
            {t('homeFresh.hero.kicker')}
          </span>{' '}
          <span className="whitespace-pre-line text-[2.15rem] leading-[1.04] sm:text-5xl lg:text-6xl">
            {t('homeFresh.hero.title')}
          </span>
        </h1>
        <p className="hidden max-w-[36ch] font-neo-body text-lg leading-relaxed text-neo-cream/80 sm:block md:text-xl">
          {t('homeFresh.hero.sub')}
        </p>
      </div>

      <div className="relative mx-auto w-[min(74vw,31svh,440px)] min-w-[220px] md:col-start-2 md:row-span-2 md:row-start-1 md:w-full md:max-w-[400px] md:-rotate-2">
        <Image
          src="/mascot/hello-nobg.webp"
          alt=""
          width={320}
          height={320}
          loading="eager"
          sizes="(min-width: 768px) 140px, 84px"
          className="pointer-events-none absolute bottom-3 -start-9 z-40 h-auto w-[76px] -rotate-6 select-none md:-end-14 md:-top-20 md:bottom-auto md:start-auto md:w-[140px] md:rotate-6"
        />
        <HeroGrid onFound={handleFound} />
      </div>

      <div
        data-hero-actions
        data-found={found ? 'true' : 'false'}
        className="hero-actions flex w-full flex-col items-stretch gap-2 sm:items-start md:col-start-1 md:row-start-2 md:self-start md:gap-4"
      >
        <style>{ACTIONS_CSS}</style>
        <FreshPlayLink
          onPlay={onPlay}
          cta="fresh_hero_play"
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-neo-lg border-3 border-neo-black bg-neo-lime px-10 py-4 font-neo-display text-xl font-bold uppercase tracking-wide text-neo-black shadow-hard-xl active:translate-x-[3px] active:translate-y-[3px] active:shadow-hard-pressed motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cream md:min-w-[18rem] md:text-2xl"
        >
          {t('homeFresh.hero.play')}
          <DirectionalIcon icon={ArrowRight} className="hero-play-arrow h-6 w-6" />
        </FreshPlayLink>
        {!isOnCrazyGamesPlatform && (
          <button
            type="button"
            onClick={() => {
              trackLandingCtaClick('fresh_hero_signin');
              setAuthOpen(true);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-neo-lg px-4 font-neo-body text-base font-bold text-neo-cream/85 underline decoration-neo-cream/30 decoration-2 underline-offset-4 hover:text-neo-cream hover:decoration-neo-lime focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cream sm:px-1"
          >
            {t('homeFresh.hero.account')}
          </button>
        )}
      </div>

      {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />}
    </section>
  );
}

/** After a found word, PLAY bounces twice and its arrow nudges: "now for real". */
const ACTIONS_CSS = `
@media (prefers-reduced-motion: no-preference){
.hero-actions[data-found=true] > a{animation:hero-play-bounce .6s cubic-bezier(.34,1.56,.64,1) 2 .25s}
.hero-actions > a:hover .hero-play-arrow{animation:hero-arrow .5s ease-in-out infinite alternate}
}
@keyframes hero-play-bounce{0%,100%{transform:translateY(0) scale(1)}40%{transform:translateY(-6px) scale(1.04)}}
@keyframes hero-arrow{to{transform:translateX(4px)}}
[dir=rtl] .hero-actions > a:hover .hero-play-arrow{animation-name:hero-arrow-rtl}
@keyframes hero-arrow-rtl{to{transform:translateX(-4px) scaleX(-1)}}
`;
