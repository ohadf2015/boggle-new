'use client';

import { useEffect, useState } from 'react';
import { Timer, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGrowthRadarFlag } from '@/hooks/useGrowthRadarFlag';
import { getPendingRoomInvite } from '@/utils/onboardingStorage';
import { PENDING_DAILY_RESULT_KEY } from '@/utils/dailyChallenge/constants';
import {
  FRESH_SIGNUP_KEY,
  POST_SIGNUP_HOME_KEY,
  SIGNUP_FIRST_GAME_KEY,
  SIGNUP_FIRST_GAME_TREATMENT,
  offerFromRead,
  peekAccountFirstGamePending,
  shouldShowSignupFirstGame,
  signupDailyHref,
  signupFirstName,
  signupQuickPlayHref,
  type SignupFirstGameOffer,
} from '@/lib/retention/signupFirstGame';

function readOffer(userId: string | undefined, role: string | null | undefined): SignupFirstGameOffer | null {
  if (typeof window === 'undefined' || !userId) return null;
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
  const stillPending = peekAccountFirstGamePending()?.userId === userId;
  return offerFromRead({
    landedHome: sessionStorage.getItem(POST_SIGNUP_HOME_KEY) === '1',
    fresh,
    pendingGame,
    role,
    userId,
    stillPending,
  });
}

/**
 * One primary card on the post-signup home. Control and anyone outside the
 * test render nothing — today's grid stays today's grid. The links are the
 * #1494 one-tap doors: quick play auto-fires, Word Wheel skips the ready card.
 */
export function SignupFirstGameCard() {
  const { t, language, dir } = useLanguage();
  const { user, profile } = useAuth();
  const [offer, setOffer] = useState<SignupFirstGameOffer | null>(null);

  useEffect(() => {
    try {
      setOffer(readOffer(user?.id, profile?.user_role));
    } catch {
      setOffer(null);
    }
  }, [user?.id, profile?.user_role]);

  const variant = useGrowthRadarFlag(SIGNUP_FIRST_GAME_KEY, offer?.expose === true);
  if (!shouldShowSignupFirstGame(offer, variant)) return null;

  const name = signupFirstName(profile?.display_name, profile?.username);
  const title = name
    ? t('landing.home.signupFirstGame.title', 'Play your first game, {name}', { name })
    : t('landing.home.signupFirstGame.titleNoName', 'Play your first game');
  const quickHref = signupQuickPlayHref(language);
  const dailyHref = signupDailyHref(language);

  return (
    <section
      data-testid="signup-first-game"
      data-variant={SIGNUP_FIRST_GAME_TREATMENT}
      data-surface={offer?.surface}
      dir={dir}
      className="rounded-neo-xl border-neo-thick border-neo-black bg-neo-navy-light p-3 shadow-hard-lg sm:p-4"
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
}
