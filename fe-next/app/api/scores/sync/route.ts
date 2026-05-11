// POST /api/scores/sync — batch sync endpoint for offline score queue.
//
// Phase 1 status: shape-only stub. Accepts batched submissions, dedupes on
// the client-issued submissionId UUID via the in-memory map below, and
// echoes the claimed score back. Server-wins word re-validation against
// the canonical dict + per-mode award dispatching is deferred to Phase 1
// follow-up — see plan doc 2026-05-11-offline-mode-phase-0-1.md task 1.7.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';

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

interface SyncResult {
  id: string;
  accepted: boolean;
  finalScore: number;
  rejectedWords: string[];
  reason?: string;
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

    const raw = await req.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'invalid_payload', details: parsed.error.flatten() }, { status: 400 });
    }

    purgeStaleDedupe();

    const results: SyncResult[] = parsed.data.submissions.map((sub) => {
      const prior = dedupeCache.get(sub.id);
      if (prior) return prior;

      // TODO Phase 1 follow-up: server-wins re-validation.
      // 1. Load canonical dict for sub.payload.language
      // 2. Filter sub.payload.words → rejectedWords = words not in dict
      // 3. Recompute finalScore from accepted words using server-side scoring rules
      // 4. Persist via existing per-mode score-save handler
      const result: SyncResult = {
        id: sub.id,
        accepted: true,
        finalScore: sub.payload.score,
        rejectedWords: [],
      };
      dedupeCache.set(sub.id, result);
      dedupeTimes.set(sub.id, Date.now());
      return result;
    });

    return NextResponse.json({ results });
  } catch (err) {
    captureApiError(err instanceof Error ? err : new Error(String(err)), 'scores-sync');
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
