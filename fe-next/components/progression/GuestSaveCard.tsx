'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { Lock } from 'lucide-react';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { revealPartNameKey } from '@/lib/avatar/revealTrigger';
import { jitter, sign } from '@/lib/animation/variety';
import { SIGNUP_PROMPT_ACTIVE_EVENT, isSignupPromptActive, type SignupPromptActiveDetail } from '@/lib/auth/signupPromptCoordination';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import { isNative } from '@/utils/platform';
import { latchSignupSource, trackGrowthEvent, trackSignupPromptClicked } from '@/utils/growthTracking';
import { LockedUnlockThumb } from './LockedUnlockThumb';
import { RarityChip } from './RarityChip';
import { XpMomentMeter } from './XpMomentMeter';
import { buildNextUnlockTeaser } from './nextUnlockModel';
import { buildXpMoment } from './xpMomentModel';

const AuthModal = dynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

const SOURCE = 'results_card';
const ENTER_DELAY_MS = 600;
const SPRING = { type: 'spring', stiffness: 380, damping: 24 } as const;
export const GUEST_SAVE_SESSION_KEY = 'lexiclash_guest_save_seen_session';
const GAMES_SINCE_KEY = 'lexiclash_guest_save_games_since';
const SHOW_EVERY_N_GAMES = 5;

/** First results screen of a session, then every 5th game. */
function planShow(): { show: boolean; gamesSince: number } {
  try {
    if (!sessionStorage.getItem(GUEST_SAVE_SESSION_KEY)) return { show: true, gamesSince: 0 };
    const gamesSince = (Number(localStorage.getItem(GAMES_SINCE_KEY)) || 0) + 1;
    return gamesSince >= SHOW_EVERY_N_GAMES ? { show: true, gamesSince: 0 } : { show: false, gamesSince };
  } catch {
    return { show: true, gamesSince: 0 };
  }
}

function useSignupSheetActive(): boolean {
  const [active, setActive] = useState(isSignupPromptActive);
  useEffect(() => {
    const on = (e: Event) => setActive(!!(e as CustomEvent<SignupPromptActiveDetail>).detail?.active);
    window.addEventListener(SIGNUP_PROMPT_ACTIVE_EVENT, on);
    return () => window.removeEventListener(SIGNUP_PROMPT_ACTIVE_EVENT, on);
  }, []);
  return active;
}

/** Guest results card: what this game would keep and unlock, with Google sign-in inline. */
export function GuestSaveCard({ gained }: { gained: number }) {
  const { t, language } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  // GSI fixes its width once at render; measured inside a results grid that is still sizing, it held the card wider than a 360px phone.
  const [googleWidth] = useState(() => (typeof window === 'undefined' ? 320 : Math.max(200, Math.min(320, window.innerWidth - 80))));
  const reduced = usePrefersReducedMotion();
  const quiet = useSignupSheetActive();
  const [entered, setEntered] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [from] = useState(() => ({ y: 28, rotate: sign() * jitter(2.5, 1) }));
  const shownRef = useRef(false);
  const [plan] = useState(planShow);
  const plannedRef = useRef(false);

  useEffect(() => {
    if (plannedRef.current) return;
    plannedRef.current = true;
    try {
      sessionStorage.setItem(GUEST_SAVE_SESSION_KEY, '1');
      localStorage.setItem(GAMES_SINCE_KEY, String(plan.gamesSince));
    } catch {
      // storage blocked: the card shows every game, as before the cap
    }
  }, [plan]);

  useEffect(() => {
    if (reduced) {
      setEntered(true);
      return;
    }
    const id = window.setTimeout(() => setEntered(true), ENTER_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [reduced]);

  useEffect(() => {
    if (!plan.show || !entered || shownRef.current) return;
    shownRef.current = true;
    trackGrowthEvent('signup_prompt_shown', { source: SOURCE, surface: SOURCE, trigger: SOURCE });
  }, [plan, entered]);

  const model = buildNextUnlockTeaser(gained);
  const googleInline = !isNative() && !!process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const lively = entered && !reduced && !quiet;

  const openMoreWays = () => {
    trackSignupPromptClicked(SOURCE);
    latchSignupSource(SOURCE);
    setAuthOpen(true);
  };

  if (isOnCrazyGamesPlatform || !plan.show) return null;
  return (
    <>
      <m.section
        data-testid="next-unlock-guest"
        data-entered={entered}
        data-quiet={quiet}
        aria-label={t('progression.unlock.signInToUnlock')}
        initial={false}
        animate={entered ? { y: 0, rotate: 0 } : from}
        transition={reduced ? { duration: 0 } : SPRING}
        className={cn(
          // No overflow-hidden: GSI drops clicks on a clipped iframe.
          'flex flex-col gap-3 rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard',
          !entered && 'invisible',
          !reduced && 'transition-[translate,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-hard-md focus-within:-translate-y-0.5 focus-within:shadow-hard-md',
        )}
      >
        <h3 className="font-neo-display text-lg font-black leading-tight text-neo-white">
          {gained > 0
            ? t('progression.xp.signInToKeep', { xp: gained.toLocaleString(language) })
            : t('progression.unlock.signInToUnlock')}
        </h3>

        {gained > 0 && (
          <m.div
            initial={false}
            animate={lively ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Remount on entry so the count-up plays where the player can see it. */}
            <XpMomentMeter key={entered ? 'in' : 'held'} moment={buildXpMoment(gained, gained)} saved={false} />
          </m.div>
        )}

        {model && (
          <div className="flex items-center gap-3">
            <span className="relative shrink-0">
              <span data-testid="guest-save-thumb" className={cn('block', lively && 'quick-node-float')}>
                <LockedUnlockThumb unlock={model.next} size={40} showLock={false} />
              </span>
              <m.span
                aria-hidden="true"
                initial={false}
                animate={lively ? { rotate: [0, -16, 13, -8, 4, 0] } : { rotate: 0 }}
                transition={{ duration: 0.55, delay: 0.45, repeat: 1, repeatDelay: 0.25, ease: 'easeInOut' }}
                className="absolute -top-2 -end-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neo-black bg-neo-yellow text-neo-black shadow-hard-sm"
              >
                <Lock className="h-3.5 w-3.5" strokeWidth={3} />
              </m.span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-1.5 text-xs font-black text-neo-white">
                <span>{t('progression.unlock.levelPath', { from: model.level, to: model.next.level })}</span>
                <RarityChip rarity={model.next.rarity} size="xs" />
              </p>
              <p className="text-[11px] font-bold text-neo-cream/80">
                {t('progression.unlock.unlocksItem', { item: t(revealPartNameKey(model.next)) })}
              </p>
            </div>
          </div>
        )}

        {googleInline && <GoogleSignInButton analyticsSource={SOURCE} width={googleWidth} className="w-full" />}
        <button
          type="button"
          data-testid="guest-save-more-ways"
          data-primary={!googleInline}
          onClick={openMoreWays}
          className={cn(
            'font-bold',
            googleInline
              ? 'self-center px-2 py-1 text-sm text-neo-cyan underline decoration-2 underline-offset-4 hover:text-neo-lime'
              : 'w-full rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-3 text-base text-neo-black shadow-hard active:translate-y-0.5 active:shadow-hard-sm',
          )}
        >
          {t('progression.unlock.moreWaysToSignIn')}
        </button>
      </m.section>
      {authOpen && <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} initialMode="signup" />}
    </>
  );
}

export default GuestSaveCard;
