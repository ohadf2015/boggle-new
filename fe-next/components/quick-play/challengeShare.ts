// Challenge rows need sign-in, so guests and failed rows share the plain Quick Play link instead.
import posthog from '@/lib/analytics/lazyPosthog';
import { trackShareCompleted, type ShareMethod } from '@/utils/share';
import { shareWithFallback, type ShareResult } from '@/utils/shareWithFallback';
import { buildQuickShareText } from './quickShareText';
import type { QuickMode, QuickRoundResult } from './types';

const SHARE_UTM = 'utm_source=share&utm_medium=quick_results';

const siteOrigin = (origin?: string) =>
  origin ?? (typeof window !== 'undefined' ? window.location.origin : 'https://www.lexiclash.live');

export function buildChallengeUrl(challengeId: string, locale: string, origin?: string): string {
  return `${siteOrigin(origin)}/${locale}/quick-play?challenge=${challengeId}&${SHARE_UTM}&utm_campaign=challenge`;
}

export function buildResultUrl(mode: QuickMode, locale: string, origin?: string): string {
  return `${siteOrigin(origin)}/${locale}/quick-play?mode=${mode}&${SHARE_UTM}&utm_campaign=${mode}`;
}

async function createChallengeId(result: QuickRoundResult): Promise<string | null> {
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
    return (await res.json()).id ?? null;
  } catch {
    return null;
  }
}

export interface ShareQuickResultInput {
  result: QuickRoundResult;
  locale: string;
  t: (key: string, params?: Record<string, string>) => string;
  isGuest: boolean;
  dayStreak: number;
}

export async function shareQuickResult({
  result,
  locale,
  t,
  isGuest,
  dayStreak,
}: ShareQuickResultInput): Promise<ShareResult> {
  const challengeId = isGuest ? null : await createChallengeId(result);
  const url = challengeId ? buildChallengeUrl(challengeId, locale) : buildResultUrl(result.mode, locale);
  const text = `${buildQuickShareText({
    mode: result.mode,
    score: result.score,
    scorePct: result.scorePct,
    words: result.words ?? [],
    targetWordFound: result.targetWordFound,
    dayStreak,
    t,
  })}\n`;

  const hadShareSheet = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const outcome = await shareWithFallback({ title: t('quickPlay.solo.shareTitle'), text, url });

  if (challengeId) {
    posthog.capture('quick_play_challenge_shared', {
      mode: result.mode,
      seed: result.seed,
      scorePct: result.scorePct,
      outcome,
    });
  }

  const method: ShareMethod | null =
    outcome === 'shared' ? 'web_share_api' : outcome === 'copied' ? (hadShareSheet ? 'fallback_clipboard' : 'clipboard') : null;
  if (method) trackShareCompleted(method, { surface: 'quick_results', mode: result.mode });

  return outcome;
}
