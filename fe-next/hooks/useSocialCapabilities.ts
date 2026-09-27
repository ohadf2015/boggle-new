'use client';

/**
 * Families Policy — client view of the user's social tier + capabilities.
 *
 * Mirrors the server's resolution (same pure lib/families/socialPolicy) so the
 * UI hides exactly what the server would reject. The server remains the source
 * of truth; this is presentation only.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  computeSocialTier,
  resolveSocialCapabilities,
  type SocialCapabilities,
  type SocialTier,
} from '@/lib/families/socialPolicy';
import {
  readGuestBirthYear,
  writeGuestBirthYear,
  readSafetyAck,
  writeSafetyAck,
  GUEST_AGE_CHANGED_EVENT,
} from '@/lib/families/guestAge';
import { resolveGrandfatheredAdult } from '@/lib/families/grandfather';

export interface UseSocialCapabilities {
  tier: SocialTier;
  caps: SocialCapabilities;
  /**
   * True once auth has SETTLED (profile loaded, or confirmed guest) — i.e. `tier`
   * can be trusted. Distinct from `ageKnown`: a terminal guest is `authResolved`
   * but not `ageKnown`. Ad init waits on this so a logged-in adult (whose
   * birth_year loads async) isn't child-directed for the whole session.
   */
  authResolved: boolean;
  /** True once we know the user's age (authed birth_year or guest declaration). */
  ageKnown: boolean;
  /** True when we must show the neutral age screen before any social surface. */
  needsAgeGate: boolean;
  /** Whether the user has acknowledged the online-safety reminder. */
  safetyAcknowledged: boolean;
  /** Persist a guest's self-declared birth year (no-op for authed users). */
  setGuestBirthYear: (year: number) => void;
  /** Record that the safety reminder has been shown + acknowledged. */
  acknowledgeSafety: () => void;
}

export function useSocialCapabilities(): UseSocialCapabilities {
  const { profile, isAuthenticated, loading } = useAuth();
  const [guestBirthYear, setGuestBirthYearState] = useState<number | null>(() =>
    readGuestBirthYear(),
  );
  const [safetyAcknowledged, setSafetyAcknowledged] = useState<boolean>(() => readSafetyAck());
  // Guest grandfather decision is made once per mount (the first call after
  // this ships persists '1'/'0' — see lib/families/grandfather.ts). Lazy state
  // keeps the localStorage write out of the render path on re-renders.
  const [guestGrandfathered] = useState<boolean>(() =>
    resolveGrandfatheredAdult({ isAuthenticated: false }),
  );

  // Re-read when ANOTHER instance declares the guest age (same-tab custom event)
  // or another tab writes it (cross-tab `storage`). Without this, instances that
  // didn't do the write — notably AdMobProvider's, which gates ads — stay frozen
  // at their mount-time value and a mid-session under-13 declaration is ignored.
  useEffect(() => {
    const resync = () => setGuestBirthYearState(readGuestBirthYear());
    window.addEventListener(GUEST_AGE_CHANGED_EVENT, resync);
    window.addEventListener('storage', resync);
    return () => {
      window.removeEventListener(GUEST_AGE_CHANGED_EVENT, resync);
      window.removeEventListener('storage', resync);
    };
  }, []);

  const currentYear = new Date().getFullYear();
  const birthYear = isAuthenticated ? profile?.birth_year ?? null : guestBirthYear;
  const computedTier = computeSocialTier(birthYear, currentYear);
  // Grandfather (2026-07-13): existing users — pre-cutoff signups and
  // pre-existing installs — are adults; only NEW users get the age gate.
  // Upgrades 'unknown' ONLY: a declared child stays a child.
  const grandfathered =
    computedTier === 'unknown' &&
    (isAuthenticated
      ? resolveGrandfatheredAdult({
          isAuthenticated: true,
          profileCreatedAt: profile?.created_at ?? null,
        })
      : guestGrandfathered);
  const tier: SocialTier = grandfathered ? 'adult' : computedTier;

  const override =
    isAuthenticated && profile?.social_features_override
      ? (profile.social_features_override as Partial<SocialCapabilities>)
      : null;

  const caps = useMemo(() => resolveSocialCapabilities(tier, override), [tier, override]);

  // ageKnown stays honest (grandfathered users never declared an age); the
  // behavioral switch is needsAgeGate — grandfathered users are never asked.
  const ageKnown = birthYear != null && tier !== 'unknown';

  const setGuestBirthYear = useCallback((year: number) => {
    writeGuestBirthYear(year);
    setGuestBirthYearState(year);
  }, []);

  const acknowledgeSafety = useCallback(() => {
    writeSafetyAck();
    setSafetyAcknowledged(true);
  }, []);

  return {
    tier,
    caps,
    authResolved: !loading,
    ageKnown,
    needsAgeGate: !ageKnown && !grandfathered,
    safetyAcknowledged,
    setGuestBirthYear,
    acknowledgeSafety,
  };
}
