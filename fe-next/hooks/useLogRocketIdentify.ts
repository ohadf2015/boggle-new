/**
 * useLogRocketIdentify — Automatically identifies the user in LogRocket
 * whenever auth state changes (login, profile update, guest name entry).
 *
 * Handles the timing gap: auth often resolves before LogRocket loads.
 * Listens for the 'logrocket-ready' event to re-run identification.
 *
 * Mount once in EssentialProviders (inside AuthProvider).
 */

import { useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { EXPERIMENTS } from '@/lib/experiments';
import { identifyGuest, identifyUser } from '@/utils/logrocket';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Read every experiment the user is bucketed into and namespace it `exp_<key>`.
 * Flags resolve async — unresolved ones return undefined and are skipped, so an
 * early call (before PostHog loads) yields {} and a later re-identify fills it in.
 */
function collectExperiments(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const key of Object.keys(EXPERIMENTS)) {
      const v = posthog.getFeatureFlag(key);
      if (typeof v === 'string') out[`exp_${key}`] = v;
      else if (typeof v === 'boolean') out[`exp_${key}`] = String(v);
    }
  } catch {
    // posthog not ready / no consent — leave map empty
  }
  return out;
}

function ageInDays(createdAt: string | undefined | null): number | undefined {
  if (!createdAt) return undefined;
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return undefined;
  return Math.max(0, Math.floor((Date.now() - t) / MS_PER_DAY));
}

function getPlatform(): string | undefined {
  try {
    return Capacitor.getPlatform();
  } catch {
    return undefined;
  }
}

export function useLogRocketIdentify(): void {
  const { user, profile, isAuthenticated, isGuest, isAdmin, isTeacher } = useAuth();

  const identify = useCallback(() => {
    if (!user && !profile) return;

    const platform = getPlatform();

    if (isAuthenticated && user && profile) {
      identifyUser({
        userId: user.id,
        // Identity
        displayName: profile.display_name || profile.username,
        username: profile.username,
        email: user.email,
        // Locale / role / context
        language: profile.language ?? undefined,
        userRole: profile.user_role,
        timezone: profile.timezone ?? undefined,
        country: profile.country_code ?? undefined,
        platform,
        appVersion: process.env.NEXT_PUBLIC_APP_VERSION,
        playerStyle: profile.player_style ?? undefined,
        birthYear: profile.birth_year ?? undefined,
        // Flags
        isGuest: false,
        isAdmin,
        isTeacher,
        isBetaTester: profile.is_beta_tester,
        hasCustomizedProfile: profile.has_customized_profile,
        avatarCustomized: profile.avatar_customized,
        blastAccess: profile.blast_access,
        practiceGraduated: Boolean(profile.practice_graduated_at),
        // Progression
        level: profile.current_level,
        prestigeLevel: profile.prestige_level,
        prestigeMultiplier: profile.prestige_multiplier,
        totalGames: profile.total_games,
        totalScore: profile.total_score,
        totalWords: profile.total_words,
        totalXp: profile.total_xp,
        lifetimeXp: profile.lifetime_xp,
        longestWordLength: profile.longest_word_length,
        streakDays: profile.streak_days,
        totalTimePlayed: profile.total_time_played,
        rankTier: profile.rank_tier,
        rankedMmr: profile.ranked_mmr,
        peakMmr: profile.peak_mmr,
        rankedWins: profile.ranked_wins,
        casualWins: profile.casual_wins,
        rankedGames: profile.ranked_games,
        casualGames: profile.casual_games,
        // Economy
        coins: profile.total_coins,
        lifetimeCoins: profile.lifetime_coins_earned,
        // Acquisition
        utmSource: profile.utm_source ?? undefined,
        utmMedium: profile.utm_medium ?? undefined,
        utmCampaign: profile.utm_campaign ?? undefined,
        referrer: profile.referrer ?? undefined,
        accountAgeDays: ageInDays(profile.created_at),
        experiments: collectExperiments(),
      });
    } else if (isGuest && profile) {
      identifyGuest(profile.id, {
        name: profile.display_name || profile.username,
        language: profile.language ?? undefined,
        platform,
      });
    }
  }, [user, profile, isAuthenticated, isGuest, isAdmin, isTeacher]);

  // Identify on auth changes
  useEffect(() => {
    identify();
  }, [identify]);

  // Re-identify when LogRocket finishes lazy loading
  useEffect(() => {
    const handler = () => identify();
    window.addEventListener('logrocket-ready', handler);
    return () => window.removeEventListener('logrocket-ready', handler);
  }, [identify]);

  // Re-identify when PostHog feature flags resolve so experiment cohorts get
  // tagged (auth usually resolves before flags). Register once via a ref to the
  // latest identify — onFeatureFlags has no unsubscribe, so re-registering on
  // every identify change would leak callbacks.
  // ponytail: register-once + ref; fine because identify is idempotent.
  const identifyRef = useRef(identify);
  identifyRef.current = identify;
  useEffect(() => {
    try {
      posthog.onFeatureFlags(() => identifyRef.current());
    } catch {
      // posthog not ready / no consent
    }
  }, []);
}
