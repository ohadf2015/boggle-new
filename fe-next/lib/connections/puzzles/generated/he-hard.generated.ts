import type { ConnectionPuzzle } from '../../types';

// Hand-cleaned from generator output on 2026-04-24.
// Kept: noun+noun (smichut) compounds AND lexicalized noun+adj compounds
// that form established multi-word terms (e.g., ספורט מוטורי = motorsport).
// Rejected: prep+toponym titles (ב<country>, ל<city>) that leaked through
// the naive 2-word script filter. Next step: wire prefix-rejection in
// lib/connections/generator/titleFilter.ts + page-existence gate.
export const HE_GENERATED: ConnectionPuzzle[] = [
  { id: 'he-g-001', word1: 'משקה', word2: 'חורף', bridge: 'ספורט', difficulty: 'hard' },
  { id: 'he-g-002', word1: 'ציוד', word2: 'חורף', bridge: 'ספורט', difficulty: 'hard' },
  { id: 'he-g-003', word1: 'תזונת', word2: 'חורף', bridge: 'ספורט', difficulty: 'hard' },
  { id: 'he-g-004', word1: 'משקה', word2: 'מוטורי', bridge: 'ספורט', difficulty: 'hard' },
  { id: 'he-g-005', word1: 'ציוד', word2: 'מוטורי', bridge: 'ספורט', difficulty: 'hard' },
  { id: 'he-g-006', word1: 'תזונת', word2: 'מוטורי', bridge: 'ספורט', difficulty: 'hard' },
];
