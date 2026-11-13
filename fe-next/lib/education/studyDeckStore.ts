import { create } from 'zustand';
import type { StudyCard } from '@/shared/utils/studyCards';

const key = (gameCode: string) => `edu-studied:${gameCode}`;
const NO_CARDS: StudyCard[] = [];

function readStudied(gameCode: string): boolean {
  try {
    return sessionStorage.getItem(key(gameCode)) === '1';
  } catch {
    return false;
  }
}

interface StudyDeckState {
  gameCode: string | null;
  cards: StudyCard[];
  studied: boolean;
  kept: { gameCode: string; cards: StudyCard[] } | null;
  setDeck: (gameCode: string, cards: StudyCard[]) => void;
  markStudied: () => void;
  clear: () => void;
  resetForJoin: (gameCode: unknown) => void;
}

/** Fed by the `classroomStudyCards` socket event; read by the student lobby. Readiness itself stays on the server. */
export const useStudyDeck = create<StudyDeckState>((set, get) => ({
  gameCode: null,
  cards: [],
  studied: false,
  kept: null,
  setDeck: (gameCode, cards) => set({ gameCode, cards, studied: readStudied(gameCode), kept: { gameCode, cards } }),
  markStudied: () => {
    const { gameCode } = get();
    if (gameCode) {
      try {
        sessionStorage.setItem(key(gameCode), '1');
      } catch {
        // Private mode: the student re-studies after a reload, nothing worse.
      }
    }
    set({ studied: true });
  },
  clear: () => set({ gameCode: null, cards: [], studied: false }),
  /** A guest's cards can be emitted before `joined` for the same room; only another room's deck is stale. */
  resetForJoin: (gameCode) => {
    const current = get().gameCode;
    if (!current || typeof gameCode !== 'string' || current.toUpperCase() !== gameCode.toUpperCase()) get().clear();
  },
}));

/** A reconnect's `joined` clears the live deck without a resend, so results fall back to the last deck seen for this room. */
export function deckCardsFor(state: Pick<StudyDeckState, 'gameCode' | 'cards' | 'kept'>, gameCode: string | null | undefined): StudyCard[] {
  if (!gameCode) return NO_CARDS;
  const code = gameCode.toUpperCase();
  if (state.gameCode?.toUpperCase() === code && state.cards.length) return state.cards;
  return state.kept?.gameCode.toUpperCase() === code ? state.kept.cards : NO_CARDS;
}
