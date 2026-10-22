import type { ClassroomGame } from './classroomGameTypes';
import { matchKey } from './classroomSummary';

export function narrowForReteach(game: ClassroomGame, words: string[]): string[] | null {
  const language = game.language ?? 'en';
  const full = game.reteach?.fullVocabularyWords ?? game.vocabularyWords ?? [];
  const { targetWord, ...settings } = game.settings ?? {};
  const fullTargetWord = game.reteach ? game.reteach.fullTargetWord : targetWord;

  const wanted = new Set(words.map((w) => matchKey(w, language)));
  const seen = new Set<string>();
  const applied = full.filter((word) => {
    const key = matchKey(word, language);
    if (!wanted.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (applied.length === 0) return null;

  game.reteach = { fullVocabularyWords: full, ...(fullTargetWord ? { fullTargetWord } : {}), pending: true };
  game.vocabularyWords = applied;
  const keepTarget = fullTargetWord && seen.has(matchKey(fullTargetWord, language));
  game.settings = (keepTarget ? { ...settings, targetWord: fullTargetWord } : settings) as ClassroomGame['settings'];
  return applied;
}

export function restoreFullLesson(game: ClassroomGame): boolean {
  if (!game.reteach) return false;
  const { fullVocabularyWords, fullTargetWord } = game.reteach;
  const { targetWord: _narrowed, ...settings } = game.settings ?? {};
  game.vocabularyWords = fullVocabularyWords;
  game.settings = (fullTargetWord ? { ...settings, targetWord: fullTargetWord } : settings) as ClassroomGame['settings'];
  delete game.reteach;
  return true;
}

/** A replay lasts one round: the first start after narrowing plays it, the next start gets the full lesson back. */
export function advanceReteachForRound(game: ClassroomGame): boolean {
  if (!game.reteach) return false;
  if (game.reteach.pending) {
    game.reteach.pending = false;
    return true;
  }
  return restoreFullLesson(game);
}
