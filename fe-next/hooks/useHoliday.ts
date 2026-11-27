'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { HolidayKey, HolidayPhase } from '@/lib/holidays/calendar';
import {
  applyHolidayOverride,
  getHolidayState,
  refineHolidayRegion,
  subscribeHoliday,
  type HolidayDomState,
} from '@/lib/holidays/holidayDom';
import { resolveRegion, type HolidayOverride, type HolidayRegion } from '@/lib/holidays/region';

export interface HolidayState {
  /** Set only while the event is live: every game, egg, hunt and daily feature gates on this. */
  holiday: HolidayKey | null;
  /** The themed holiday in either phase: the coming-soon card, mascot and toggle read this. */
  theme: HolidayKey | null;
  phase: HolidayPhase;
  resolved: boolean;
  region: HolidayRegion;
  available: HolidayKey[];
  setOverride: (v: HolidayOverride) => void;
}

const getServerState = (): HolidayDomState | null => null;

export function useHoliday(): HolidayState {
  const { isAuthenticated, loading, profile } = useAuth();
  const dom = useSyncExternalStore(subscribeHoliday, getHolidayState, getServerState);
  const profileRegion = profile?.country_code ? resolveRegion({ countryCode: profile.country_code }) : null;

  useEffect(() => {
    if (profileRegion) refineHolidayRegion(profileRegion);
  }, [profileRegion]);

  const setOverride = useCallback((v: HolidayOverride) => applyHolidayOverride(v), []);

  const resolved =
    dom !== null && !loading && !(isAuthenticated && !profile) && (!profileRegion || dom.region === profileRegion);

  const theme = resolved ? dom.holiday : null;
  const phase = theme && dom ? dom.phase : 'off';
  return {
    holiday: phase === 'live' ? theme : null,
    theme,
    phase,
    resolved,
    region: dom?.region ?? 'world',
    available: dom?.available ?? [],
    setOverride,
  };
}
