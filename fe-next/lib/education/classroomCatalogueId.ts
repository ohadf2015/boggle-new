// Boss Battle is the vocab quiz engine with vocabQuizVariant 'boss'; every other card IS its game mode.

import { VOCAB_QUIZ_MODE, type ClassroomGameMode, type VocabQuizVariant } from '@/shared/types/vocabQuiz';

export const BOSS_BATTLE_ID = 'boss-battle' as const;
export type ClassroomCatalogueId = ClassroomGameMode | typeof BOSS_BATTLE_ID;

export interface CatalogueLaunch {
  gameMode: ClassroomGameMode;
  vocabQuizVariant?: VocabQuizVariant;
}

export function launchOf(id: ClassroomCatalogueId): CatalogueLaunch {
  return id === BOSS_BATTLE_ID ? { gameMode: VOCAB_QUIZ_MODE, vocabQuizVariant: 'boss' } : { gameMode: id };
}

export function catalogueIdOf(gameMode: ClassroomGameMode, variant: VocabQuizVariant | null | undefined): ClassroomCatalogueId {
  return gameMode === VOCAB_QUIZ_MODE && variant === 'boss' ? BOSS_BATTLE_ID : gameMode;
}

const KEY = 'lessonGameData';

export function readLocalQuizVariant(): VocabQuizVariant | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const variant = raw ? (JSON.parse(raw) as { vocabQuizVariant?: unknown }).vocabQuizVariant : null;
    return variant === 'boss' ? 'boss' : null;
  } catch {
    return null;
  }
}

export function writeLocalQuizVariant(variant: VocabQuizVariant | null): void {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (variant === 'boss') data.vocabQuizVariant = variant;
    else delete data.vocabQuizVariant;
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage off or corrupt: the server record still carries the variant */
  }
}

/** null = unknown (express launch, repeat setup): the server refusal is the backstop. */
export function readLocalQuizPlayable(): boolean | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const playable = raw ? (JSON.parse(raw) as { quizPlayable?: unknown }).quizPlayable : null;
    return typeof playable === 'boolean' ? playable : null;
  } catch {
    return null;
  }
}
