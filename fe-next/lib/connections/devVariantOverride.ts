import type { ConnectionsDailyVariant } from './dailyVariant';

/** Dev-only `?variant=pyramid|regular`, so either flavor can be checked on any day. Never honored in production. */
export function devVariantOverride(search: string, env: string | undefined = process.env.NODE_ENV): ConnectionsDailyVariant | null {
  if (env === 'production') return null;
  const value = new URLSearchParams(search).get('variant');
  return value === 'pyramid' || value === 'regular' ? value : null;
}
