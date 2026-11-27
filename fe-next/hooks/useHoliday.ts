'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { HolidayKey } from '@/lib/holidays/calendar';
import {
  applyHolidayOverride,
  getHolidayState,
  refineHolidayRegion,
  subscribeHoliday,
  type HolidayDomState,
} from '@/lib/holidays/holidayDom';
import { resolveRegion, type HolidayOverride, type HolidayRegion } from '@/lib/holidays/region';

export interface HolidayState {
  holiday: HolidayKey | null;
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

  return {
    holiday: resolved ? dom.holiday : null,
    resolved,
    region: dom?.region ?? 'world',
    available: dom?.available ?? [],
    setOverride,
  };
}
