/**
 * useLogRocketIdentify — Automatically identifies the user in LogRocket
 * whenever auth state changes (login, profile update, guest name entry).
 *
 * Handles the timing gap: auth often resolves before LogRocket loads.
 * Listens for the 'logrocket-ready' event to re-run identification.
 *
 * Mount once in EssentialProviders (inside AuthProvider).
 */

import { useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

import { useAuth } from '@/contexts/AuthContext';
import { identifyGuest, identifyUser } from '@/utils/logrocket';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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
        // Flags
        isGuest: false,
        isAdmin,
        isTeacher,
        hasCustomizedProfile: profile.has_customized_profile,
        blastAccess: profile.blast_access,
        practiceGraduated: Boolean(profile.practice_graduated_at),
        // Progression
        level: profile.current_level,
        prestigeLevel: profile.prestige_level,
        totalGames: profile.total_games,
        totalScore: profile.total_score,
        totalWords: profile.total_words,
        totalXp: profile.total_xp,
        longestWordLength: profile.longest_word_length,
        streakDays: profile.streak_days,
        rankTier: profile.rank_tier,
        rankedMmr: profile.ranked_mmr,
        // Acquisition
        utmSource: profile.utm_source ?? undefined,
        utmMedium: profile.utm_medium ?? undefined,
        utmCampaign: profile.utm_campaign ?? undefined,
        referrer: profile.referrer ?? undefined,
        accountAgeDays: ageInDays(profile.created_at),
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
}
