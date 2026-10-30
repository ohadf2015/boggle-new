'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m } from 'framer-motion';
import { TrendingUp, Medal, Users, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuestStatsSummary } from '@/utils/guestManager';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { cn } from '@/lib/utils';
import {
  OAuthButtonGroup,
  AuthErrorMessage,
  AuthTermsFooter,
  type AuthBenefit,
} from './shared';
import { useOAuthSignIn } from './hooks/useOAuthSignIn';
import {
  GAME_COMPLETED_SIGNAL,
  isPostGameCompleted,
  latchSignupSource,
  trackGrowthEvent,
} from '@/utils/growthTracking';
import {
  isResultsInlineCapped,
  recordResultsInlineImpression,
} from '@/utils/signupImpressionCap';
import { markResultsInlineShown } from '@/lib/auth/signupPromptCoordination';

interface InlineSignupCardProps {
  isAuthenticated: boolean;
  className?: string;
  /** Override the header copy (default: 'auth.multiGames.title'). Used by the
   *  solo results screen to reframe signup as streak insurance (t_89663cfc). */
  titleKey?: string;
  /** Override the body copy (default: 'auth.multiGames.subtitle'). */
  bodyKey?: string;
  /** Fired when the player taps any sign-in button (analytics). */
  onCTAClick?: () => void;
  /**
   * Prompt-surface id (e.g. 'results_inline'). When set the card: renders only
   * after `growth:game_completed` with no live round; emits
   * `signup_prompt_shown` / `signup_prompt_clicked` with this `source`; and
   * latches it so `signup_completed` is attributed to it.
   */
  analyticsSource?: string;
  /** Drop the benefits list + stats teaser (tight layouts, e.g. MP results). */
  compact?: boolean;
}

const benefits: AuthBenefit[] = [
  { icon: TrendingUp, translationKey: 'auth.firstWin.benefits.trackProgress' },
  { icon: Medal, translationKey: 'auth.firstWin.benefits.leaderboard' },
  { icon: Users, translationKey: 'auth.firstWin.benefits.playWithFriends' },
];

/**
 * InlineSignupCard — neo-brutalist inline signup CTA shown on results pages
 * for unauthenticated guests. Replaces the FirstWinSignupModal popup with
 * a non-intrusive, context-aware card.
 */
const InlineSignupCard: React.FC<InlineSignupCardProps> = ({
  isAuthenticated,
  className,
  titleKey = 'auth.multiGames.title',
  bodyKey = 'auth.multiGames.subtitle',
  onCTAClick,
  analyticsSource,
  compact = false,
}) => {
  const { t } = useLanguage();
  const { isOnCrazyGamesPlatform } = useCrazyGames();
  const { signIn, loadingProvider, error } = useOAuthSignIn({ analyticsSource });

  // Gate attributed surfaces on a real game_completed (never mid-round).
  const gated = !!analyticsSource;
  const [gameCompleted, setGameCompleted] = useState<boolean>(() => !gated || isPostGameCompleted());
  useEffect(() => {
    if (!gated || gameCompleted || typeof window === 'undefined') return;
    const onCompleted = () => {
      if (isPostGameCompleted()) setGameCompleted(true);
    };
    window.addEventListener(GAME_COMPLETED_SIGNAL, onCompleted);
    onCompleted();
    return () => window.removeEventListener(GAME_COMPLETED_SIGNAL, onCompleted);
  }, [gated, gameCompleted]);

  // t_561836a1: results_inline is capped at RESULTS_INLINE_DAILY_CAP renders
  // per guest per local day (73% of its impressions were a guest's 4th+ that
  // day and produced 1 of 19 clicks). Past the cap the card does not render
  // and no signup_prompt_shown is emitted. Signed-in users never reach this —
  // `visible` is already false for them, so the cap only ever gates guests.
  // Read in the initializer like the gameCompleted gate above: the gated card
  // renders null on the server either way, so there is no hydration mismatch.
  const isCappedSurface = analyticsSource === 'results_inline';
  const [capped, setCapped] = useState<boolean>(() => isCappedSurface && isResultsInlineCapped());

  const visible = !isAuthenticated && !isOnCrazyGamesPlatform && gameCompleted && !capped;

  const shownRef = useRef(false);
  useEffect(() => {
    if (!visible || !analyticsSource || shownRef.current) return;
    if (isCappedSurface) {
      // Race guard: another mount may have burnt the last impression since
      // this one initialized — never emit (or render) past the cap.
      if (isResultsInlineCapped()) {
        setCapped(true);
        return;
      }
      shownRef.current = true;
      const capRank = recordResultsInlineImpression();
      // t_ac5ac2f7: latch the session so the mp_sheet tier never stacks a
      // second ask on a guest this card already asked (58/60 overlap, 0
      // signups in 14d). Marked at SHOW time, alongside the event.
      markResultsInlineShown();
      trackGrowthEvent('signup_prompt_shown', {
        source: analyticsSource,
        surface: analyticsSource,
        trigger: analyticsSource,
        cap_rank: capRank,
      });
      return;
    }
    shownRef.current = true;
    trackGrowthEvent('signup_prompt_shown', {
      source: analyticsSource,
      surface: analyticsSource,
      trigger: analyticsSource,
    });
  }, [visible, analyticsSource, isCappedSurface]);

  const latch = () => {
    if (analyticsSource) latchSignupSource(analyticsSource);
  };

  const handleSignIn = (provider: 'google' | 'discord') => {
    latch();
    onCTAClick?.();
    signIn(provider);
  };

  if (!visible) return null;

  const guestStats = getGuestStatsSummary();

  return (
    <m.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={cn(
        'relative bg-neo-navy-light border-neo-thick border-neo-black shadow-hard rounded-neo p-4 sm:p-5 overflow-hidden',
        className,
      )}
      aria-label={t(titleKey)}
      data-signup-surface={analyticsSource}
    >
      {/* Decorative accent stripe */}
      <div
        aria-hidden
        className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-neo-lime via-neo-cyan to-neo-pink"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="text-neo-lime shrink-0" size={20} aria-hidden />
        <h3 className="font-neo-display text-lg sm:text-xl font-bold text-neo-white">
          {t(titleKey)}
        </h3>
      </div>
      <p className="text-sm text-neo-white mb-4 leading-snug">
        {t(bodyKey)}
      </p>

      {/* Benefits */}
      {!compact && (
      <ul className="space-y-2 mb-4">
        {benefits.map((benefit, index) => (
          <m.li
            key={benefit.translationKey}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + index * 0.08 }}
            className="flex items-center gap-2.5 text-sm text-neo-white"
          >
            <benefit.icon className="shrink-0 text-neo-cyan" size={16} aria-hidden />
            <span>{t(benefit.translationKey)}</span>
          </m.li>
        ))}
      </ul>
      )}

      {/* Guest stats teaser */}
      {!compact && guestStats.gamesPlayed > 0 && (
        <div className="mb-4 px-3 py-2 rounded-neo bg-neo-navy border-neo border-neo-cyan/40 text-center text-xs text-neo-cyan">
          {t('auth.firstWin.statsTeaser', {
            games: guestStats.gamesPlayed,
            score: guestStats.totalScore,
          })}
        </div>
      )}

      {/* OAuth buttons */}
      {/* Capture-phase latch: the GSI Google button is an iframe that never
          calls onSignIn, so attribute on pointerdown for every provider. */}
      <div onPointerDownCapture={latch}>
        <OAuthButtonGroup onSignIn={handleSignIn} loadingProvider={loadingProvider} analyticsSource={analyticsSource} />
      </div>

      {error && <AuthErrorMessage message={error} className="mt-3" />}

      <AuthTermsFooter className="mt-3" />
    </m.section>
  );
};

export default InlineSignupCard;
