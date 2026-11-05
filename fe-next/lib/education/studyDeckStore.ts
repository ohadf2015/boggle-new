import { create } from 'zustand';
import type { StudyCard } from '@/shared/utils/studyCards';

const key = (gameCode: string) => `edu-studied:${gameCode}`;

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
  setDeck: (gameCode: string, cards: StudyCard[]) => void;
  markStudied: () => void;
  clear: () => void;
}

/** Fed by the `classroomStudyCards` socket event; read by the student lobby. Readiness itself stays on the server. */
export const useStudyDeck = create<StudyDeckState>((set, get) => ({
  gameCode: null,
  cards: [],
  studied: false,
  setDeck: (gameCode, cards) => set({ gameCode, cards, studied: readStudied(gameCode) }),
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
}));
