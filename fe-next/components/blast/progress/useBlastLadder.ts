'use client';

import { useEffect, useState } from 'react';
import { getWithAuth } from '@/utils/authFetch';
import type { RivalScore } from './rivalTarget';
import { readLocalBest } from './localBest';

export interface BlastLadderState {
  personalBest: number | null;
  /** Weekly board rank before this run. */
  rank: number | null;
  /** Nearest weekly scores above the player, closest first. */
  rivals: RivalScore[];
}

const EMPTY: BlastLadderState = { personalBest: null, rank: null, rivals: [] };

/** Targets to chase this run, fetched once per run (guests get none). */
export function useBlastLadder({ language, difficulty, runId }: { language: string; difficulty: string; runId: number }): BlastLadderState {
  const [state, setState] = useState<BlastLadderState>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    getWithAuth(`/api/blast/result?difficulty=${encodeURIComponent(difficulty)}&ladder=${encodeURIComponent(language)}`, { requireSession: true })
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setState({ ...EMPTY, personalBest: readLocalBest(difficulty) });
          return;
        }
        const body = (await res.json()) as {
          personalBests?: Record<string, { bestScore?: number }>;
          ladder?: { rank: number | null; rivals: RivalScore[] };
        };
        if (cancelled) return;
        setState({
          personalBest: body.personalBests?.[difficulty]?.bestScore ?? null,
          rank: body.ladder?.rank ?? null,
          rivals: body.ladder?.rivals ?? [],
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [language, difficulty, runId]);

  return state;
}
