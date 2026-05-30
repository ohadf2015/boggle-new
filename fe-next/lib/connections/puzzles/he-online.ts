import type { ConnectionPuzzle } from '../types';

/**
 * Hebrew Word Bridge riddles harvested from online content (Hebrew common-word
 * games + collocation sources) on 2026-05-30, then put through a 3-judge
 * adversarial gate (each judge independently confirmed BOTH "word1 bridge" and
 * "bridge word2" are natural Hebrew, the three words are distinct, and all are
 * base letters). Only unanimous survivors were kept, then hand-curated to drop
 * the "מאוד" intensifier loophole and a duplicate of he-m-006.
 *
 * Kept in a separate file so the imported batch can be audited / reverted as a
 * unit. The bridge is the answer; word1/word2 are the clues shown to the player.
 */
export const HE_ONLINE: ConnectionPuzzle[] = [
  // בית ספר (school) + ספר חדש (new book) — ספר bridges school/book
  { id: 'he-o-001', word1: 'בית', word2: 'חדש', bridge: 'ספר', difficulty: 'easy' },
  // עץ תפוח (apple tree) + תפוח אדום (red apple)
  { id: 'he-o-002', word1: 'עץ', word2: 'אדום', bridge: 'תפוח', difficulty: 'easy' },
  // מחשב נייד (laptop) + נייד חדש (new mobile)
  { id: 'he-o-003', word1: 'מחשב', word2: 'חדש', bridge: 'נייד', difficulty: 'medium' },
  // אתר אינטרנט (website) + אינטרנט מהיר (fast internet)
  { id: 'he-o-004', word1: 'אתר', word2: 'מהיר', bridge: 'אינטרנט', difficulty: 'medium' },
  // ראש ממשלה (prime minister) + ממשלה חדשה (new government)
  { id: 'he-o-005', word1: 'ראש', word2: 'חדשה', bridge: 'ממשלה', difficulty: 'medium' },
];
