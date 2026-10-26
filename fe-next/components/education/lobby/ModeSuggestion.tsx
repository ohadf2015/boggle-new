'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { fetchRecentTeacherRounds } from '@/lib/education/recentTeacherRounds';
import { isRehearsing, PRO_ONLY_MODES, suggestNextMode, type SuggestionRound } from '@/lib/education/modeSuggestion';
import { trackModeSuggestionAccepted, trackModeSuggestionShown } from '@/lib/education/modeSuggestionTelemetry';
import { modeAllowsRehearsalBots, peekRehearseIntent } from '@/lib/education/rehearsal';
import { catalogueEntry, catalogueModes } from '../ClassroomModeCatalogueData';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export interface ModeSuggestionProps {
  selected: ClassroomCatalogueId;
  isBlocked: (id: ClassroomCatalogueId) => boolean;
  onPick: (id: ClassroomCatalogueId) => void;
  t: Translate;
}

interface Suggestion {
  id: ClassroomCatalogueId;
  from: ClassroomCatalogueId;
  rehearsing: boolean;
}

/** One "try something new" tap for a teacher stuck on the same modes; it only selects, GO LIVE still launches. */
export function ModeSuggestion({ selected, isBlocked, onPick, t }: ModeSuggestionProps) {
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
    if (decided.current || !rounds || entitlement.loading) return;
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
  }, [rounds, entitlement, selected, isBlocked]);

  if (!suggestion || accepted || suggestion.id === selected || isBlocked(suggestion.id)) return null;
  const mode = catalogueEntry(suggestion.id);
  if (!mode) return null;

  return (
    <button
      type="button"
      data-testid="mode-suggestion"
      data-mode={suggestion.id}
      onClick={() => {
        setAccepted(true);
        trackModeSuggestionAccepted({ suggestedMode: suggestion.id, selectedMode: selected, rehearsing: suggestion.rehearsing });
        onPick(suggestion.id);
      }}
      className="inline-flex min-h-9 max-w-full items-center gap-1.5 self-start rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 font-neo-display text-xs font-black text-neo-black shadow-hard-sm transition-transform active:translate-y-0.5 active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan lg:text-sm"
    >
      <Sparkles className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{t('eg2Modes.trySomethingNew', { mode: t(mode.nameKey) })}</span>
    </button>
  );
}

export default ModeSuggestion;
