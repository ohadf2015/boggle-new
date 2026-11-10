/**
 * The student's classroom level and word bank, client-side. One writer: the `joined` and
 * `classroomContext` listeners in useMultiplayerSocket. A store, not hook state, because the
 * round dock under the grid needs the level and shares no prop chain with the page.
 */
import { create } from 'zustand';
import { isVocabularyLevel } from '@/lib/education/differentiation';
import type { VocabularyLevel } from '@/lib/supabase/education/types';

interface ClassroomContextState {
  level: VocabularyLevel;
  wordBank: string[];
}

const EMPTY: ClassroomContextState = { level: 'core', wordBank: [] };

export const useClassroomContextStore = create<ClassroomContextState>(() => EMPTY);

export function resetClassroomContext(): void {
  useClassroomContextStore.setState(EMPTY);
}

export function ingestClassroomContext(data: { classroomLevel?: unknown; classroomWordBank?: unknown } | null | undefined): void {
  useClassroomContextStore.setState({
    level: isVocabularyLevel(data?.classroomLevel) ? data.classroomLevel : 'core',
    wordBank: Array.isArray(data?.classroomWordBank) ? data.classroomWordBank.filter((w): w is string => typeof w === 'string') : [],
  });
}

/** A support student with words holds the bottom word-bank sheet. */
export function useHoldsWordBank(): boolean {
  return useClassroomContextStore((s) => s.level === 'support' && s.wordBank.length > 0);
}
