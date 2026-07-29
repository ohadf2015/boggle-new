/**
 * Doorway-page guard (2026-05-30): the esl-word-games and
 * vocabulary-games-classroom meta descriptions were ~80% identical (only
 * "ESL"/"vocabulary" + "bilingual" keyword-swapped) — the classic near-
 * duplicate signal that gets one of two landing pages deprioritized. These
 * tests pin meaningful differentiation: each page must carry its own distinct
 * angle in the meta, not a keyword-swapped clone of a shared template.
 */
import { describe, it, expect } from 'vitest';
import { getVocabClassroomContent } from '../vocabulary-games-classroom/content';
import { getEslWordGamesContent } from '../esl-word-games/content';

// Jaccard word overlap of two strings (0 = disjoint, 1 = identical sets).
function wordOverlap(a: string, b: string): number {
  const norm = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
  const A = norm(a);
  const B = norm(b);
  const inter = [...A].filter((w) => B.has(w)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

describe('education variant differentiation (anti-doorway)', () => {
  const vocab = getVocabClassroomContent('en');
  const esl = getEslWordGamesContent('en');

  it('esl-word-games meta carries an English-learner / CEFR angle vocab does not', () => {
    const eslBlob = `${esl.metaTitle} ${esl.metaDescription}`.toLowerCase();
    expect(eslBlob).toMatch(/cefr|a1|english learner|english language learner|proficiency|efl/);
  });

  it('esl and vocab meta descriptions are NOT near-duplicates', () => {
    const overlap = wordOverlap(esl.metaDescription, vocab.metaDescription);
    // pre-fix this was ~0.6+; require meaningful divergence.
    expect(overlap).toBeLessThan(0.4);
  });

  it('meta titles are distinct strings', () => {
    expect(esl.metaTitle).not.toBe(vocab.metaTitle);
  });
});
