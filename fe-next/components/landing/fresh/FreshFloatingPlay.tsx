'use client';

/**
 * Persistent floating PLAY for the fresh-visitor homepage (growth proposal:
 * "Fix landing→onboarding gap — 93% of visitors never enter onboarding").
 *
 * On mobile the hero stacks copy → board → actions, so the primary CTA can
 * land below the first viewport; this pill keeps PLAY one thumb-reach away at
 * every scroll depth. Desktop hides it (`md:hidden`) — the hero PLAY is
 * already above the fold there, and a fixed pill would cover the board.
 *
 * Same PLAY contract as FreshHero via FreshPlayLink: a real
 * `<a href="/{locale}/singleplayer?autoStart=coach">` in the server HTML; a
 * mounted `onPlay` only upgrades the click. The distinct cta id
 * (`floating_play` vs `fresh_hero_play`) lets the landing_cta_clicked funnel
 * attribute onboarding starts to the pill.
 *
 * Bottom clearance (nav / AdMob banner + cookie sheet) lives in the module
 * CSS, mirroring the body reservations in globals.css so nothing
 * viewport-pinned covers the pill.
 */
import { ArrowRight } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { firstGameRoute } from '@/lib/onboarding/firstGameRoute';
import { FreshPlayLink } from './FreshPlayLink';
import styles from './FreshFloatingPlay.module.css';

export interface FreshFloatingPlayProps {
  /** Opens OnboardingFlow in quick play (PageClient). Absent on the server. */
  onPlay?: () => void;
}

export function FreshFloatingPlay({ onPlay }: FreshFloatingPlayProps) {
  const { t, language } = useLanguage();
  return (
    <div
      data-fresh-floating-play=""
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 md:hidden ${styles.floatingPlay}`}
    >
      <FreshPlayLink
        onPlay={onPlay}
        cta="floating_play"
        href={firstGameRoute(language)}
        className="pointer-events-auto inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-neo-lg border-3 border-neo-black bg-neo-lime px-8 py-3 font-neo-poster text-base font-extrabold uppercase tracking-[0.02em] text-neo-black shadow-hard-xl active:translate-y-[2px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-black"
      >
        {t('homeFresh.hero.play')}
        <DirectionalIcon icon={ArrowRight} className="h-5 w-5" />
      </FreshPlayLink>
    </div>
  );
}
