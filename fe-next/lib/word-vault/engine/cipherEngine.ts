import type { CipherJar, CipherRiddle } from '../types';
import { normalizeHebrewFinalForms } from './wordConstraintEngine';

export function sortedLetters(s: string): string {
  return [...normalizeHebrewFinalForms(s)].sort().join('');
}

export function isAnagramOf(candidate: string, target: string): boolean {
  return sortedLetters(candidate) === sortedLetters(target);
}

export type CipherJudgement =
  | { ok: true; jarId: string; matched: string }
  | { ok: false; reason: 'no-match' | 'red-herring' | 'wrong-word' };

export function judgeCipherAttempt(
  jar: CipherJar,
  candidate: string,
): CipherJudgement {
  if (!isAnagramOf(candidate, jar.scrambled)) {
    return { ok: false, reason: 'no-match' };
  }
  if (jar.isRedHerring) {
    return { ok: false, reason: 'red-herring' };
  }
  if (normalizeHebrewFinalForms(candidate) !== normalizeHebrewFinalForms(jar.answer)) {
    return { ok: false, reason: 'wrong-word' };
  }
  return { ok: true, jarId: jar.id, matched: jar.answer };
}

export function isRiddleSolved(riddle: CipherRiddle, solvedJarIds: Set<string>): boolean {
  const required = riddle.jars.filter((j) => !j.isRedHerring).map((j) => j.id);
  return required.every((id) => solvedJarIds.has(id));
}
