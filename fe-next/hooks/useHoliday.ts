'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { HolidayKey, HolidayPhase } from '@/lib/holidays/calendar';
import {
  applyHolidayOverride,
  getHolidayState,
  refineHolidayRegion,
  subscribeHoliday,
  type HolidayDomState,
} from '@/lib/holidays/holidayDom';
import { parseOverride } from '@/lib/holidays/override';
import { otherHoliday, resolveRegion, type HolidayRegion } from '@/lib/holidays/region';

export interface HolidayState {
  /** Set only while the event is live: every game, egg, hunt and daily feature gates on this. */
  holiday: HolidayKey | null;
  /** The themed holiday in either phase: the coming-soon card, mascot and profile badge read this. */
  theme: HolidayKey | null;
  phase: HolidayPhase;
  resolved: boolean;
  region: HolidayRegion;
  available: HolidayKey[];
  /** Signed-in players can flip to the other holiday while its window is open. */
  canSwap: boolean;
  /** Resolves false when the save failed and the previous holiday was put back. */
  swap: () => Promise<boolean>;
}

const getServerState = (): HolidayDomState | null => null;

export function useHoliday(): HolidayState {
  const { isAuthenticated, loading, profile, updateProfile } = useAuth();
  const dom = useSyncExternalStore(subscribeHoliday, getHolidayState, getServerState);
  const profileRegion = profile?.country_code ? resolveRegion({ countryCode: profile.country_code }) : null;
  const profileHoliday = isAuthenticated ? parseOverride(profile?.holiday_key) : null;
  const [pending, setPending] = useState<HolidayKey | null>(null);

  useEffect(() => {
    if (profileRegion) refineHolidayRegion(profileRegion);
  }, [profileRegion]);

  useEffect(() => {
    if (profileHoliday && getHolidayState().override !== profileHoliday) applyHolidayOverride(profileHoliday);
  }, [profileHoliday]);

  const wanted = pending ?? profileHoliday;
  const resolved =
    dom !== null &&
    !loading &&
    !(isAuthenticated && !profile) &&
    (!profileRegion || dom.region === profileRegion) &&
    (!wanted || dom.override === wanted);

  const theme = resolved ? dom.holiday : null;
  const phase = theme && dom ? dom.phase : 'off';
  const swapTo = theme ? otherHoliday(theme) : null;
  const canSwap = isAuthenticated && !pending && !!swapTo && !!dom?.available.includes(swapTo);

  const swap = useCallback(async () => {
    if (!canSwap || !theme || !swapTo) return false;
    const previous = getHolidayState().override;
    setPending(swapTo);
    applyHolidayOverride(swapTo);
    const { error } = await updateProfile({ holiday_key: swapTo });
    if (error) applyHolidayOverride(previous ?? theme);
    setPending(null);
    return !error;
  }, [canSwap, theme, swapTo, updateProfile]);

  return {
    holiday: phase === 'live' ? theme : null,
    theme,
    phase,
    resolved,
    region: dom?.region ?? 'world',
    available: dom?.available ?? [],
    canSwap,
    swap,
  };
}
