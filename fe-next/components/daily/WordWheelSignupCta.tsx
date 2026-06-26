'use client';

import React, { useEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Crown, Sparkles, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { recordSignupModalDismissed } from '@/utils/dailyChallenge';
import DailyChallengeInlineSignup from '@/components/auth/DailyChallengeInlineSignup';
import {
  selectWheelSignupOffer,
  type WheelSignupOfferType,
} from '@/utils/dailyChallenge/wheelSignupOffer';
import {
  selectWheelRankEncouragement,
  type WheelRankEncouragement,
} from '@/utils/dailyChallenge/wheelRankEncouragement';

interface WordWheelSignupCtaProps {
  isAuthenticated: boolean;
  isPractice: boolean;
  /** Current daily-streak length (getDailyStreak().currentStreak). */
  streakDays: number;
  /** True on the player's first-ever daily completion. */
  isFirstCompletion: boolean;
  /** True if the signup modal was dismissed within the cooldown window. */
  dismissedRecently: boolean;
  /** This run's score. */
  score: number;
  /** The guest's live rank on today's Word Wheel leaderboard (1-based), or null
   *  if not yet placed. Drives the rank-aware "you're #1 today" headline. */
  rank?: number | null;
  /** Total players on today's board — used for honest "#N of M" framing. */
  totalPlayers?: number;
}

const EXPERIMENT_KEY = 'wheel-signup-offer-v1' as const;

/**
 * Rank-aware headline + icon, surfaced in place of the generic offer copy when
 * the guest holds a brag-worthy position on today's board. This is the
 * strongest *honest* signup hook the wheel has: the guest is already on the
 * leaderboard (by fingerprint), so signing up simply locks the spot to a real
 * account that survives across devices. Value-led, never loss-aversion.
 */
function rankCopy(
  enc: WheelRankEncouragement,
  t: (key: string, vars?: Record<string, string | number>) => string,
): { icon: React.ReactNode; title: string } {
  switch (enc.tier) {
    case 'leader':
      return {
        icon: <Crown className="w-5 h-5 text-neo-yellow" strokeWidth={2.5} aria-hidden />,
        title: t('wordWheel.signup.rankLeaderTitle'),
      };
    case 'podium':
      return {
        icon: <Trophy className="w-5 h-5 text-neo-yellow" strokeWidth={2.5} aria-hidden />,
        title: t('wordWheel.signup.rankPodiumTitle', { rank: enc.rank }),
      };
    case 'topTen':
    default:
      return {
        icon: <Trophy className="w-5 h-5 text-neo-cyan" strokeWidth={2.5} aria-hidden />,
        title: t('wordWheel.signup.rankTopTenTitle', { rank: enc.rank }),
      };
  }
}

/** Per-offer headline + icon. Value-led, never loss-aversion (Families policy). */
function offerCopy(
  offer: WheelSignupOfferType,
  streakDays: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): { icon: React.ReactNode; title: string } {
  switch (offer) {
    case 'streak-value':
      return {
        icon: <Flame className="w-5 h-5 text-neo-orange" strokeWidth={2.5} aria-hidden />,
        title: t('wordWheel.signup.streakTitle', { count: streakDays }),
      };
    case 'board-spot':
      return {
        icon: <Trophy className="w-5 h-5 text-neo-yellow" strokeWidth={2.5} aria-hidden />,
        title: t('wordWheel.signup.boardTitle'),
      };
    case 'first-completion':
    default:
      return {
        icon: <Sparkles className="w-5 h-5 text-neo-lime" strokeWidth={2.5} aria-hidden />,
        title: t('wordWheel.signup.firstTitle'),
      };
  }
}

/**
 * Guest signup CTA shown after a Word Wheel daily game. Word Wheel completions
 * bypass the generic SP/MP signup gate, so this restores a conversion surface
 * for the mode. The offer framing comes from the pure `selectWheelSignupOffer`;
 * the `wheel-signup-offer-v1` experiment decides whether to render at all.
 *
 * Tapping "Sign up free" reveals the proven `DailyChallengeInlineSignup` surface
 * (OAuth + magic-link + OTP). The wheel result is already persisted server-side
 * by guest fingerprint, so no pendingResult is threaded through.
 */
const WordWheelSignupCta: React.FC<WordWheelSignupCtaProps> = ({
  isAuthenticated,
  isPractice,
  streakDays,
  isFirstCompletion,
  dismissedRecently,
  score,
  rank = null,
  totalPlayers = 0,
}) => {
  const { t } = useLanguage();
  const { variant, trackExposure } = useExperiment(EXPERIMENT_KEY);
  const [expanded, setExpanded] = useState(false);
  const exposedRef = useRef(false);
  const viewedRef = useRef(false);

  const offer = selectWheelSignupOffer({
    isAuthenticated,
    isPractice,
    streakDays,
    isFirstCompletion,
    dismissedRecently,
    score,
  });

  // Rank-aware framing upgrade: when the guest holds a brag-worthy board spot,
  // "you're #1 today" replaces the generic offer headline. Eligibility is
  // unchanged (still driven by `offer`) so the running A/B population is
  // untouched — only the copy gets stronger for guests who already qualify.
  const rankEncouragement = selectWheelRankEncouragement(rank, totalPlayers);

  // Eligibility is variant-independent — any guest who *would* qualify for the
  // offer. Render only in the treatment arm.
  const eligible = offer !== null;
  const show = eligible && variant === 'streak-value';

  // Exposure must fire for ALL eligible users in BOTH arms, else the control
  // bucket has no denominator and the nightly A/B read can't compute lift.
  useEffect(() => {
    if (!eligible || exposedRef.current) return;
    exposedRef.current = true;
    trackExposure();
  }, [eligible, trackExposure]);

  // The "CTA shown" signal is distinct from exposure — fires only when the
  // treatment CTA actually renders.
  useEffect(() => {
    if (!show || viewedRef.current) return;
    viewedRef.current = true;
    trackGrowthEvent('wheel_signup_cta_viewed', {
      experiment: EXPERIMENT_KEY,
      variant,
      offerType: offer,
      rankTier: rankEncouragement?.tier ?? null,
      rank: rankEncouragement?.rank ?? null,
      streakDays,
      score,
    });
  }, [show, variant, offer, rankEncouragement, streakDays, score]);

  if (!show) return null;

  // Rank brag wins the headline when present; otherwise fall back to the
  // value-led offer copy chosen by selectWheelSignupOffer.
  const { icon, title } = rankEncouragement
    ? rankCopy(rankEncouragement, t)
    : offerCopy(offer, streakDays, t);

  const handleOpen = () => {
    setExpanded(true);
    trackGrowthEvent('wheel_signup_cta_clicked', {
      experiment: EXPERIMENT_KEY,
      variant,
      offerType: offer,
      rankTier: rankEncouragement?.tier ?? null,
      rank: rankEncouragement?.rank ?? null,
      streakDays,
      score,
    });
  };

  const handleDismiss = () => {
    setExpanded(false);
    recordSignupModalDismissed();
  };

  return (
    <m.div
      data-testid="wheel-signup-cta"
      className="w-full z-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, type: 'spring', stiffness: 300, damping: 26 }}
    >
      <AnimatePresence mode="wait">
        {!expanded ? (
          <button
            key="collapsed"
            type="button"
            data-testid="wheel-signup-cta-button"
            onClick={handleOpen}
            className="flex items-center justify-between gap-3 w-full p-4 rounded-neo border-3 border-neo-black bg-neo-cyan shadow-hard-lg hover:scale-[1.02] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all text-start"
          >
            <span className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-neo border-2 border-neo-black bg-neo-navy shrink-0">
                {icon}
              </span>
              <span>
                <span className="block font-neo-display font-black text-neo-black text-sm leading-tight">
                  {title}
                </span>
                <span className="block text-neo-black/70 text-xs mt-0.5">
                  {t('wordWheel.signup.subtitle')}
                </span>
              </span>
            </span>
            <ArrowRight className="w-5 h-5 text-neo-black shrink-0 rtl:rotate-180" aria-hidden />
          </button>
        ) : (
          <m.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <DailyChallengeInlineSignup onDismiss={handleDismiss} />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  );
};

export default WordWheelSignupCta;
