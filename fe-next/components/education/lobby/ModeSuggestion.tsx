'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { fetchRecentTeacherRounds } from '@/lib/education/recentTeacherRounds';
import { isRehearsing, PRO_ONLY_MODES, suggestNextMode, type SuggestionRound } from '@/lib/education/modeSuggestion';
import { trackModeSuggestionAccepted, trackModeSuggestionShown } from '@/lib/education/modeSuggestionTelemetry';
import { modeAllowsRehearsalBots, peekRehearseIntent } from '@/lib/education/rehearsal';
import { catalogueModes } from '../ClassroomModeCatalogueData';

export interface ModeSuggestionArgs {
  selected: ClassroomCatalogueId;
  isBlocked: (id: ClassroomCatalogueId) => boolean;
  /** False while the lobby is still deciding the list and mode, so the pick is made against the settled screen. */
  ready?: boolean;
}

interface Suggestion {
  id: ClassroomCatalogueId;
  from: ClassroomCatalogueId;
  rehearsing: boolean;
}

/** One mode a teacher stuck on the same games has not tried; the grid tags its tile, picking it only selects. */
export function useModeSuggestion({ selected, isBlocked, ready = true }: ModeSuggestionArgs) {
  const { user } = useAuth();
  const entitlement = useTeacherPro();
  const [rounds, setRounds] = useState<SuggestionRound[] | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [accepted, setAccepted] = useState(false);
  const decided = useRef(false);
  const teacherId = user?.id ?? '';

  useEffect(() => {
    if (!teacherId) return;
    let live = true;
    fetchRecentTeacherRounds(teacherId).then((r) => {
      if (live) setRounds(r);
    });
    return () => {
      live = false;
    };
  }, [teacherId]);

  // Decided once, after rounds AND the Pro check resolve, so the chip never swaps under the teacher's finger.
  useEffect(() => {
    if (!ready || decided.current || !rounds || entitlement.loading) return;
    decided.current = true;
    const intent = peekRehearseIntent() !== null;
    const id = suggestNextMode({
      rounds,
      candidates: catalogueModes().map((m) => m.id),
      selected,
      hasPro: hasProAccess(entitlement, Date.now()),
      rehearseIntent: intent,
      isBlocked,
      isProOnly: (mode) => PRO_ONLY_MODES.has(mode),
      botCapable: (mode) => modeAllowsRehearsalBots(launchOf(mode).gameMode),
    });
    if (!id) return;
    const next = { id, from: selected, rehearsing: isRehearsing(rounds, intent) };
    setSuggestion(next);
    trackModeSuggestionShown({ suggestedMode: id, selectedMode: selected, rehearsing: next.rehearsing });
  }, [ready, rounds, entitlement, selected, isBlocked]);

  const onPicked = useCallback(
    (id: ClassroomCatalogueId) => {
      if (!suggestion || accepted || id !== suggestion.id) return;
      setAccepted(true);
      trackModeSuggestionAccepted({ suggestedMode: suggestion.id, selectedMode: selected, rehearsing: suggestion.rehearsing });
    },
    [suggestion, accepted, selected]
  );

  const visible = !!suggestion && !accepted && suggestion.id !== selected && !isBlocked(suggestion.id);
  return { suggested: visible ? suggestion.id : null, onPicked };
}
