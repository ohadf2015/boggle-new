/**
 * Quick Play challenge-link share — the viral loop.
 * Creates a same-board challenge row, then shares the deep link via
 * Web Share / clipboard fallback. The friend plays YOUR exact board;
 * their score becomes your rival card. No emoji grids.
 */
import posthog from '@/lib/analytics/lazyPosthog';
import { shareWithFallback, type ShareResult } from '@/utils/shareWithFallback';
import type { QuickRoundResult } from './types';

export function buildChallengeUrl(challengeId: string, locale: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live');
  return `${base}/${locale}/quick-play?challenge=${challengeId}`;
}

export async function shareChallenge(
  result: QuickRoundResult,
  locale: string,
  t: (key: string, params?: Record<string, string>) => string
): Promise<ShareResult | null> {
  let id: string | null = null;
  try {
    const res = await fetch('/api/quick-play/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: result.mode,
        seed: result.seed,
        score: result.score,
        scorePct: result.scorePct,
      }),
    });
    if (!res.ok) return null;
    id = (await res.json()).id ?? null;
  } catch {
    return null;
  }
  if (!id) return null;

  const url = buildChallengeUrl(id, locale);
  const outcome = await shareWithFallback({
    title: t('quickPlay.solo.shareTitle'),
    text: t('quickPlay.solo.shareText', { pct: String(result.scorePct) }),
    url,
  });
  posthog.capture('quick_play_challenge_shared', {
    mode: result.mode,
    seed: result.seed,
    scorePct: result.scorePct,
    outcome,
  });
  return outcome;
}
