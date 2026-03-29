/**
 * useLogRocketIdentify — Automatically identifies the user in LogRocket
 * whenever auth state changes (login, profile update, guest name entry).
 *
 * Handles the timing gap: auth often resolves before LogRocket loads.
 * Listens for the 'logrocket-ready' event to re-run identification.
 *
 * Mount once in EssentialProviders (inside AuthProvider).
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { identifyUser, identifyGuest } from '@/utils/logrocket';

export function useLogRocketIdentify(): void {
  const { user, profile, isAuthenticated, isGuest, isAdmin, isTeacher } = useAuth();

  const identify = useCallback(() => {
    if (!user && !profile) return;

    if (isAuthenticated && user && profile) {
      identifyUser({
        userId: user.id,
        displayName: profile.display_name || profile.username,
        email: user.email,
        isGuest: false,
        isAdmin,
        isTeacher,
        level: profile.current_level,
        totalGames: profile.total_games,
        country: profile.country_code ?? undefined,
        utmSource: profile.utm_source ?? undefined,
        prestigeLevel: profile.prestige_level,
      });
    } else if (isGuest && profile) {
      identifyGuest(
        profile.id,
        profile.display_name || profile.username
      );
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
