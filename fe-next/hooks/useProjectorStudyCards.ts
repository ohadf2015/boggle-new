'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/utils/authFetch';
import { parseStudyCards, type StudyCard } from '@/shared/utils/studyCards';

const NONE: StudyCard[] = [];

/** The lesson words for the teacher's projector wall; empty on any failure, so the lobby just shows no panel. */
export function useProjectorStudyCards(gameCode: string | undefined, enabled: boolean): StudyCard[] {
  const [cards, setCards] = useState<StudyCard[]>(NONE);

  useEffect(() => {
    setCards(NONE);
    if (!enabled || !gameCode || gameCode.length !== 6) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchWithAuth(
          `/api/education/classroom/live-game/cards?code=${encodeURIComponent(gameCode)}`,
          { requireSession: true }
        );
        if (!res.ok || res.status === 204) return;
        const body = (await res.json()) as { cards?: unknown };
        if (!cancelled) setCards(parseStudyCards(body?.cards));
      } catch {
        /* no words on the wall; the match is unaffected */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameCode, enabled]);

  return cards;
}
