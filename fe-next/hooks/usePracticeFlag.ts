'use client';

import { useSearchParams } from 'next/navigation';

const TRUTHY = new Set(['1', 'true', 'yes']);

/**
 * Reads `?practice=1` from URL. When true, engines should:
 *  - Skip XP / coin / leaderboard writes
 *  - Skip daily-streak completion
 *  - Render <PracticeBadge /> in the HUD
 *
 * Lenient on truthy values (`1` | `true` | `yes`) but strict-false on missing
 * or `0` so a user who removes the flag mid-session reverts to real stakes.
 */
export function usePracticeFlag(): boolean {
  const params = useSearchParams();
  const raw = params?.get('practice');
  return raw != null && TRUTHY.has(raw.toLowerCase());
}
