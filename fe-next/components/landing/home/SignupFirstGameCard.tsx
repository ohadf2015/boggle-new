'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Timer, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGrowthRadarFlag } from '@/hooks/useGrowthRadarFlag';
import { getPendingRoomInvite } from '@/utils/onboardingStorage';
import { PENDING_DAILY_RESULT_KEY } from '@/utils/dailyChallenge/constants';
import {
  FRESH_SIGNUP_KEY,
  SIGNUP_FIRST_GAME_KEY,
  SIGNUP_FIRST_GAME_TREATMENT,
  isSignupFirstGameHomePath,
  isSignupFirstGamePath,
  offerFromRead,
  peekAccountFirstGamePending,
  shouldShowSignupFirstGame,
  signupDailyHref,
  signupFirstName,
  signupQuickPlayHref,
  type SignupFirstGameOffer,
} from '@/lib/retention/signupFirstGame';

interface CardUser {
  id?: string;
  is_anonymous?: boolean;
}

/**
 * Eligibility = the fresh-signup mark AuthProvider wrote on the guest → authed
 * flip + the CURRENT ROUTE. No dependency on the auth/callback redirect:
 * Google One Tap / ID-token signups never pass through it, and redirect
 * providers always carry next=<the page they were on> (t_5ebe9081).
 */
function readOffer(
  user: CardUser | null | undefined,
  role: string | null | undefined,
  pathname: string | null,
): SignupFirstGameOffer | null {
  if (typeof window === 'undefined' || !user?.id) return null;
  let fresh: { userId: string; surface: string } | null = null;
  try {
    const raw = sessionStorage.getItem(FRESH_SIGNUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { userId?: string; surface?: string };
      if (parsed.userId) {
        fresh = { userId: parsed.userId, surface: parsed.surface || 'header_or_menu' };
      }
    }
  } catch {
    fresh = null;
  }
  const pendingGame =
    getPendingRoomInvite() !== null ||
    sessionStorage.getItem(PENDING_DAILY_RESULT_KEY) !== null;
  const stillPending = peekAccountFirstGamePending()?.userId === user.id;
  return offerFromRead({
    pathEligible: isSignupFirstGamePath(pathname),
    fresh,
    pendingGame,
    role,
    userId: user.id,
    isAnonymous: user.is_anonymous === true,
    stillPending,
  });
}

/**
 * One card for eligible fresh signups. Control (and anyone outside the test)
 * renders nothing — the flag read is the exposure, so it fires only once
 * eligibility is true, in BOTH arms. `floating` is the non-home placement:
 * a small fixed card under the header instead of the home grid's inline slot.
 */
function SignupFirstGameCardImpl({ pathname, floating }: { pathname: string | null; floating?: boolean }) {
  const { t, language, dir } = useLanguage();
  const { user, profile } = useAuth();
  const [offer, setOffer] = useState<SignupFirstGameOffer | null>(null);

  useEffect(() => {
    try {
      setOffer(readOffer(user, profile?.user_role, pathname));
    } catch {
      setOffer(null);
    }
  }, [user, profile?.user_role, pathname]);

  const variant = useGrowthRadarFlag(SIGNUP_FIRST_GAME_KEY, offer?.expose === true);
  if (!shouldShowSignupFirstGame(offer, variant)) return null;

  const name = signupFirstName(profile?.display_name, profile?.username);
  const title = name
    ? t('landing.home.signupFirstGame.title', 'Play your first game, {name}', { name })
    : t('landing.home.signupFirstGame.titleNoName', 'Play your first game');
  const quickHref = signupQuickPlayHref(language);
  const dailyHref = signupDailyHref(language);

  const card = (
    <section
      data-testid="signup-first-game"
      data-variant={SIGNUP_FIRST_GAME_TREATMENT}
      data-surface={offer?.surface}
      data-placement={floating ? 'floating' : 'inline'}
      dir={dir}
      className={`rounded-neo-xl border-neo-thick border-neo-black bg-neo-navy-light p-3 shadow-hard-lg sm:p-4${
        floating ? ' pointer-events-auto w-full max-w-md' : ''
      }`}
    >
      <a
        href={quickHref}
        data-testid="signup-first-game-quick"
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 py-3 text-center font-neo-display text-base font-black uppercase tracking-wide text-neo-black shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed sm:text-lg"
      >
        <Users className="h-5 w-5 shrink-0" aria-hidden />
        <span>{title}</span>
      </a>
      <a
        href={dailyHref}
        data-testid="signup-first-game-daily"
        className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-4 py-2 text-center font-neo-display text-sm font-black uppercase tracking-wide text-neo-black shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
      >
        <Timer className="h-4 w-4 shrink-0" aria-hidden />
        <span>{t('landing.home.signupFirstGame.daily', "Today's Word Wheel (2 min)")}</span>
      </a>
    </section>
  );

  if (!floating) return card;
  // Fixed under the header (z-[60] stays above), centered, clicks pass
  // through around the card so it never blocks the page it floats over.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-height-mobile,64px)+8px)] z-40 flex justify-center px-3 md:top-[calc(var(--header-height-desktop,64px)+8px)]">
      {card}
    </div>
  );
}

/** Home slot: inline in the ReturningHome grid, as #1503 shipped it. */
export function SignupFirstGameCard() {
  const pathname = usePathname();
  return <SignupFirstGameCardImpl pathname={pathname} />;
}

/**
 * Every other non-game page (SEO landings, leaderboard, blog, …) — where an
 * in-page Google signup actually leaves the fresh account. Home keeps its
 * inline slot, so the floating card never doubles up there.
 */
export function SignupFirstGameGlobalCard() {
  const pathname = usePathname();
  if (isSignupFirstGameHomePath(pathname)) return null;
  return <SignupFirstGameCardImpl pathname={pathname} floating />;
}
