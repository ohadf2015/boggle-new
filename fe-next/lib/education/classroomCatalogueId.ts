// Boss Battle is a classic board with a classroomBossId; every other card IS its game mode.
// A room still carrying the retired vocab-quiz 'boss' variant reads back as Boss Battle too.

import { VOCAB_QUIZ_MODE, type ClassroomGameMode, type VocabQuizVariant } from '@/shared/types/vocabQuiz';
import { FREE_CLASSROOM_BOSS_ID, isClassroomBossId, type ClassroomBossId } from '@/shared/types/classroomBoss';

export const BOSS_BATTLE_ID = 'boss-battle' as const;
export type ClassroomCatalogueId = ClassroomGameMode | typeof BOSS_BATTLE_ID;

export interface CatalogueLaunch {
  gameMode: ClassroomGameMode;
  vocabQuizVariant?: VocabQuizVariant;
  classroomBossId?: ClassroomBossId;
}

export function launchOf(id: ClassroomCatalogueId, bossId: ClassroomBossId = FREE_CLASSROOM_BOSS_ID): CatalogueLaunch {
  return id === BOSS_BATTLE_ID ? { gameMode: 'classic', classroomBossId: bossId } : { gameMode: id };
}

export function catalogueIdOf(
  gameMode: ClassroomGameMode,
  variant: VocabQuizVariant | null | undefined,
  bossId?: unknown,
): ClassroomCatalogueId {
  if (gameMode === VOCAB_QUIZ_MODE && variant === 'boss') return BOSS_BATTLE_ID;
  if (gameMode === 'classic' && isClassroomBossId(bossId)) return BOSS_BATTLE_ID;
  return gameMode;
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

export function readLocalBossId(): ClassroomBossId | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const id = raw ? (JSON.parse(raw) as { classroomBossId?: unknown }).classroomBossId : null;
    return isClassroomBossId(id) ? id : null;
  } catch {
    return null;
  }
}

export function writeLocalBossId(bossId: ClassroomBossId | null): void {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (bossId) data.classroomBossId = bossId;
    else delete data.classroomBossId;
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage off or corrupt: the server record still carries the boss */
  }
}
