import { launchOf, type ClassroomCatalogueId } from '@/lib/education/classroomCatalogueId';
import { REAL_CLASS_MIN_PLAYERS } from '@/lib/education/teacherUsagePrompt';

export interface SuggestionRound {
  gameMode: string;
  playerCount: number;
}

export interface SuggestNextModeArgs {
  /** Newest first. */
  rounds: readonly SuggestionRound[];
  candidates: readonly ClassroomCatalogueId[];
  selected: ClassroomCatalogueId;
  hasPro: boolean;
  rehearseIntent: boolean;
  isBlocked: (id: ClassroomCatalogueId) => boolean;
  isProOnly: (id: ClassroomCatalogueId) => boolean;
  botCapable: (id: ClassroomCatalogueId) => boolean;
}

export const SUGGESTION_WINDOW = 10;
const RECENT_EXCLUDED = 3;

// Every catalogue mode launches on the free tier today (Boss Battle falls back to the free boss).
export const PRO_ONLY_MODES: ReadonlySet<ClassroomCatalogueId> = new Set();

export function isRehearsing(rounds: readonly SuggestionRound[], rehearseIntent: boolean): boolean {
  return rehearseIntent || rounds.slice(0, SUGGESTION_WINDOW).every((r) => r.playerCount < REAL_CLASS_MIN_PLAYERS);
}

export function suggestNextMode(args: SuggestNextModeArgs): ClassroomCatalogueId | null {
  const window = args.rounds.slice(0, SUGGESTION_WINDOW);
  if (window.length === 0) return null;

  // Rounds store the engine mode, so Boss Battle (a classic board) reads as classic.
  const recent = new Set(window.slice(0, RECENT_EXCLUDED).map((r) => r.gameMode));
  const plays = (id: ClassroomCatalogueId) => window.filter((r) => r.gameMode === launchOf(id).gameMode).length;
  const rehearsing = isRehearsing(window, args.rehearseIntent);

  const eligible = args.candidates.filter(
    (id) =>
      id !== args.selected &&
      !recent.has(launchOf(id).gameMode) &&
      !args.isBlocked(id) &&
      (args.hasPro || !args.isProOnly(id))
  );
  const ranked = eligible
    .map((id, order) => ({ id, order, plays: plays(id), bots: rehearsing && args.botCapable(id) ? 0 : 1 }))
    .sort((a, b) => a.bots - b.bots || a.plays - b.plays || a.order - b.order);
  return ranked[0]?.id ?? null;
}
