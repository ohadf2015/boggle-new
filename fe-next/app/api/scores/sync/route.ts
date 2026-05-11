// POST /api/scores/sync — batch sync endpoint for offline score queue.
//
// Server-wins: client-claimed score is IGNORED. For each submission, we
// re-validate every word against the canonical server dictionary and
// recompute finalScore from the accepted words via the shared
// calculateWordScoreByLength helper. Combos/multipliers are not
// re-applied (server has no game-state context for a queued
// submission), so finalScore is intentionally a conservative floor —
// clients render the adjustment via the offline.sync.adjusted toast.
//
// Per-mode award dispatch (coins/streaks/badges via existing handlers)
// is still TODO — current implementation accepts/rejects but does not
// yet persist to per-mode score tables. Tracked as Phase 1 follow-up.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import { createClient } from '@/utils/supabase/server';
import {
  revalidateSubmission,
  type RevalidateResult,
  type ServerSubmission,
} from '@/lib/offline/serverRevalidate';
import { validateWordOnServer } from '@/lib/wordValidation/serverDicts';

// Per-mode award dispatch map. Each handler is responsible for granting
// coins/streak/badges/XP for an accepted submission. Returns the awards
// object surfaced to the client in the sync response. See plan:
// docs/plans/2026-05-11-offline-mode-phase-1b-award-dispatch.md
type AwardHandler = (
  sub: ServerSubmission,
  userId: string,
) => Promise<Record<string, number>>;

const awardHandlers: Partial<Record<ServerSubmission['mode'], AwardHandler>> = {
  // sp:    pending (no live handler — only stats aggregate)
  // wotd:  pending Phase 1b extract from dailyChallengeRouter
  // daily-survival:  pending
  // daily-wordhunt:  pending
  // brain: pending extract from /api/drills/submit
  // adventure: pending extract from /api/adventure/complete
};

const SubmissionSchema = z.object({
  id: z.string().uuid(),
  mode: z.enum(['sp', 'wotd', 'daily-survival', 'daily-wordhunt', 'brain', 'adventure']),
  payload: z.object({
    score: z.number().int().nonnegative(),
    words: z.array(z.string()).optional(),
    language: z.string().optional(),
    puzzleDate: z.string().optional(),
  }),
  clientCompletedAt: z.number().int().positive(),
});

const RequestSchema = z.object({
  submissions: z.array(SubmissionSchema).min(1).max(50),
});

interface SyncResult extends RevalidateResult {
  awards?: Record<string, number> | null;
  awardError?: string;
}

const dedupeCache = new Map<string, SyncResult>();
const DEDUPE_TTL_MS = 24 * 60 * 60 * 1000;
const dedupeTimes = new Map<string, number>();

function purgeStaleDedupe(): void {
  const cutoff = Date.now() - DEDUPE_TTL_MS;
  for (const [id, ts] of dedupeTimes) {
    if (ts < cutoff) {
      dedupeCache.delete(id);
      dedupeTimes.delete(id);
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const limit = checkApiRateLimit(req, 'scores-sync', { windowMs: 60_000, maxRequests: 20 });
    if (!limit.success) return rateLimitResponse(limit);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const raw = await req.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
    }

    purgeStaleDedupe();

    const results: SyncResult[] = [];
    for (const sub of parsed.data.submissions) {
      const prior = dedupeCache.get(sub.id);
      if (prior) {
        results.push(prior);
        continue;
      }
      const revalidated = await revalidateSubmission(sub, validateWordOnServer);
      const result: SyncResult = { ...revalidated };

      if (revalidated.accepted) {
        const handler = awardHandlers[sub.mode];
        if (handler) {
          try {
            result.awards = await handler(sub, user.id);
          } catch (err) {
            result.awardError = err instanceof Error ? err.message : 'unknown_award_error';
            captureApiError(
              err instanceof Error ? err : new Error(String(err)),
              'scores-sync.award',
              { userId: user.id, body: { mode: sub.mode } },
            );
          }
        } else {
          result.awards = null;
        }
      }

      dedupeCache.set(sub.id, result);
      dedupeTimes.set(sub.id, Date.now());
      results.push(result);
    }

    return NextResponse.json({ results });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'scores-sync');
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
