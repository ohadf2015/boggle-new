/**
 * Fabricated classroom data for the DEV-ONLY live-surface previews
 * (`/education/classroom-game?preview=podium|projector`). Never imported by a
 * production path: the preview component that uses it is dropped from the
 * production bundle by a `NODE_ENV` guard around its dynamic import.
 */

import type { ClassroomSummary } from '@/shared/types/classroom';

const WORDS = [
  'journey', 'crystal', 'harvest', 'thunder', 'whisper', 'island', 'forest',
  'shadow', 'mirror', 'castle', 'desert', 'silver', 'travel', 'sunset',
];

const NAMES = [
  'Maya', 'Leo', 'Noa', 'Ari', 'Sofia', 'Omar', 'Yuki', 'Lucas', 'Emma', 'Dan',
  'Tamar', 'Hugo', 'Aiko', 'Nina', 'Eli', 'Zoe', 'Ravi', 'Lena', 'Max', 'Ines',
  'Kai', 'Mila', 'Theo', 'Ella', 'Ben', 'Lior', 'Sara', 'Finn', 'Nora', 'Ivo',
];

export function sampleClassroomSummary(): ClassroomSummary {
  const coverage = WORDS.map((word, i) => ({
    word,
    foundBy: i % 4 === 3 ? [] : [NAMES[i % 5]],
  }));
  const missedWords = coverage.filter((c) => c.foundBy.length === 0).map((c) => c.word);
  const classFoundCount = coverage.length - missedWords.length;
  return {
    teacherName: 'Ms. Rivera',
    lessonNames: ['Weekly Vocabulary'],
    lessonIds: ['preview-lesson'],
    totalWords: WORDS.length,
    coverage,
    missedWords,
    classFoundCount,
    masteryByPlayer: {
      Maya: { found: 6, total: WORDS.length },
      Leo: { found: 4, total: WORDS.length },
      Noa: { found: 3, total: WORDS.length },
      Ari: { found: 1, total: WORDS.length },
    },
    podium: [
      { username: 'Maya', score: 148, rank: 1, wordsFound: 6, totalWords: WORDS.length },
      { username: 'Leo', score: 112, rank: 2, wordsFound: 4, totalWords: WORDS.length },
      { username: 'Noa', score: 87, rank: 3, wordsFound: 3, totalWords: WORDS.length },
    ],
  };
}

export function sampleProjectorStudents(count: number): { username: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    username: i < NAMES.length ? NAMES[i] : `${NAMES[i % NAMES.length]} ${Math.floor(i / NAMES.length) + 1}`,
  }));
}
