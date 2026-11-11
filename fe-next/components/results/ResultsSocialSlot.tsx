'use client';

import { useEffect, useState } from 'react';
import { NewRecordBanner } from '@/components/progression/NewRecordBanner';
import { NextUnlockTeaser } from '@/components/progression/NextUnlockTeaser';
import { RivalCard } from '@/components/rivals/RivalCard';
import { WorldRecordChip } from '@/components/records/WorldRecordChip';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PUBLISHING_MODES, publishRunRecord } from '@/lib/records/runRecord';
import type { ResultsMode, RivalSummary } from '@/lib/rivals/types';
import { getWithAuth } from '@/utils/authFetch';
import { getDailyChallengeDate } from '@/utils/dailyChallenge/dateUtils';
import { getGuestFingerprint } from '@/utils/dailyChallenge/guestPlayer';
import { PublicNamePrompt } from './PublicNamePrompt';

export interface ResultsSocialSlotProps {
  mode: ResultsMode;
  score?: number;
  opponentUserIds?: string[];
  classroomId?: string;
  /** The best captured before this run wrote its own result. */
  previousBest?: number | null;
  /** The score the rival is compared on when it differs from `score` (Quick Play compares % of par). */
  rivalScore?: number;
  /** Quick Play's inner mode, so ghost rivals come from the same mode. */
  subMode?: string;
  /** Daily puzzle date (YYYY-MM-DD). */
  date?: string;
  /** A rival the screen already knows (edu classroom standings): no lookup runs. */
  rival?: RivalSummary | null;
  onRematch?: () => void;
}

/** The one social block every results screen mounts: name prompt, new record, rival, next unlock. */
export function ResultsSocialSlot({ mode, score, rivalScore, opponentUserIds, previousBest, subMode, date, rival: given, onRematch }: ResultsSocialSlotProps) {
  const { loading, isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const [fetched, setFetched] = useState<RivalSummary | null>(null);
  const opponents = (opponentUserIds ?? []).join(',');

  useEffect(() => {
    if (score == null || !PUBLISHING_MODES.has(mode)) return;
    publishRunRecord({ mode, value: score, previous: previousBest });
  }, [mode, score, previousBest]);

  useEffect(() => {
    if (given !== undefined || mode === 'edu' || loading) return;
    const params = new URLSearchParams({ mode, lang: language });
    const compared = rivalScore ?? score;
    if (compared != null) params.set('score', String(compared));
    // The self fallback compares against the same scale, so only send a best that matches it.
    if (previousBest != null && rivalScore == null) params.set('previousBest', String(previousBest));
    if (opponents) params.set('opponents', opponents);
    if (subMode) params.set('subMode', subMode);
    params.set('date', date ?? getDailyChallengeDate());
    let cancelled = false;
    // The rival is a bonus: a failed lookup just leaves the card out (the route reports its own errors).
    (isAuthenticated ? Promise.resolve(null) : getGuestFingerprint().catch(() => null))
      .then((fp) => {
        if (fp) params.set('fp', fp);
        return getWithAuth(`/api/rivals/current?${params}`, { cache: 'no-store' });
      })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { rival?: RivalSummary | null } | null) => { if (!cancelled) setFetched(body?.rival ?? null); })
      .catch(() => { if (!cancelled) setFetched(null); });
    return () => { cancelled = true; };
  }, [given, mode, loading, isAuthenticated, language, score, rivalScore, previousBest, opponents, subMode, date]);

  const rival = given !== undefined ? given : fetched;

  return (
    <div data-testid="results-social-slot" className="flex flex-col gap-3 w-full">
      <PublicNamePrompt mode={mode} />
      <NewRecordBanner mode={mode} score={score} />
      {mode !== 'edu' && <WorldRecordChip mode={mode} subMode={subMode} score={score} />}
      {rival && <RivalCard rival={rival} mode={mode} onRematch={onRematch} />}
      <NextUnlockTeaser mode={mode} />
    </div>
  );
}

export default ResultsSocialSlot;
