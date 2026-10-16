/**
 * Fabricated round data for the DEV-ONLY results previews
 * (`/education/classroom-game?preview=hostresults|phone|quiz|duel|ended`).
 * Never imported by a production path: the preview that uses it is dropped
 * from the production bundle by a `NODE_ENV` guard around its dynamic import.
 */

import type { ClassroomSummary } from '@/shared/types/classroom';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';
import type { VocabQuizStanding } from '@/shared/types/vocabQuiz';
import type { PlayerResult } from '@/types/components';
import { sampleClassroomSummary, samplePreviewPlayers, type PreviewOutcome } from './previewFixtures';

export const LONG_PREVIEW_NAME = 'Maximiliana Castellanos-Ruiz';

const EXTRA_NAMES = [
  'Omar', 'Yuki', 'Lucas', 'Emma', 'Dan', 'Tamar', 'Hugo', 'Aiko', 'Nina', 'Eli', 'Zoe', 'Ravi', 'Lena', 'Max',
  'Ines', 'Kai', 'Mila', 'Theo', 'Ella', 'Ben', 'Lior', 'Sara', 'Finn', 'Nora', 'Ivo', 'Gal', 'Rina', 'Tom', 'Uri',
];

const FOUND_WORDS = ['journey', 'crystal', 'harvest', 'thunder', 'whisper', 'island', 'stone', 'notes', 'rest'];

function wordsFor(score: number, offset: number): PlayerResult['allWords'] {
  if (score <= 0) return [];
  const n = Math.max(1, Math.min(FOUND_WORDS.length, Math.round(score / 18)));
  return Array.from({ length: n }, (_, i) => {
    const word = FOUND_WORDS[(i + offset) % FOUND_WORDS.length];
    return { word, score: word.length * 3 - i, validated: true, isDuplicate: false };
  });
}

export interface PreviewRound {
  summary: ClassroomSummary;
  players: PlayerResult[];
}

export interface PreviewRoundOptions {
  /** Grow the class to this many students (low scorers appended). */
  count?: number;
  /** Swap the winner's name for a 28-character one. */
  longNames?: boolean;
  /** Rounds played this session; from 2 the wall shows session standings. */
  rounds?: number;
}

/** A summary and the final scores that go with it, so both projector paths and both phones agree. */
export function samplePreviewRound(variant: PreviewOutcome, { count = 0, longNames = false, rounds = 1 }: PreviewRoundOptions = {}): PreviewRound {
  const summary = sampleClassroomSummary(variant);
  const wordPlayers = new Map(samplePreviewPlayers(variant).map((p) => [p.username, p]));
  const teacher = summary.teacherName;
  let players: PlayerResult[] = (summary.podium ?? [])
    .filter((p) => p.username !== teacher)
    .map((p, i) => ({
      username: p.username,
      score: p.score,
      wordsFoundCount: wordPlayers.get(p.username)?.allWords?.length ?? wordsFor(p.score, i)?.length ?? 0,
      allWords: wordPlayers.get(p.username)?.allWords ?? wordsFor(p.score, i),
    }));
  const total = summary.totalWords;
  const seeded = players.length;
  for (let i = seeded; i < count; i++) {
    const n = i - seeded;
    const username = EXTRA_NAMES[n % EXTRA_NAMES.length] + (n >= EXTRA_NAMES.length ? ` ${n}` : '');
    const score = Math.max(0, 70 - i * 3);
    players.push({ username, score, wordsFoundCount: wordsFor(score, i)?.length ?? 0, allWords: wordsFor(score, i) });
    summary.masteryByPlayer[username] = { found: score > 30 ? 1 : 0, total };
  }
  if (longNames && players[0]) {
    const old = players[0].username;
    players = players.map((p) => (p.username === old ? { ...p, username: LONG_PREVIEW_NAME } : p));
    summary.podium = (summary.podium ?? []).map((p) => (p.username === old ? { ...p, username: LONG_PREVIEW_NAME } : p));
    summary.masteryByPlayer[LONG_PREVIEW_NAME] = summary.masteryByPlayer[old];
    delete summary.masteryByPlayer[old];
    summary.coverage = summary.coverage.map((c) => ({ ...c, foundBy: c.foundBy.map((n) => (n === old ? LONG_PREVIEW_NAME : n)) }));
  }
  if (rounds > 1) {
    // Earlier rounds favour the students who did worse this round, so the table visibly moves.
    const totals = players.map((p, i) => ({ username: p.username, totalScore: p.score + ((players.length - i) * 23) % 97 + 30 * (rounds - 1) }));
    summary.roundsPlayed = rounds;
    summary.sessionStandings = totals
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((row, i) => ({ ...row, roundsPlayed: rounds, rank: i + 1 }));
  }
  return { summary, players };
}

export function sampleBossView(status: 'defeated' | 'escaped'): ClassroomBossView {
  const won = status === 'defeated';
  return {
    bossId: 'lexiconDragon',
    hp: won ? 0 : 38,
    maxHp: 100,
    phase: 3,
    status,
    telegraph: null,
    nextAttackMs: null,
    shield: 0,
    shieldMax: 0,
    combo: { count: 0, multiplier: 1, msLeft: 0 },
    lastHits: [],
    topHitters: [
      { username: 'Maya', dmg: 41 },
      { username: 'Leo', dmg: 27 },
      { username: 'Noa', dmg: 19 },
    ],
    effect: null,
    staggers: 2,
    pctDealt: won ? 100 : 62,
  };
}

export function sampleQuizStandings(count = 6): VocabQuizStanding[] {
  const names = ['Maya', 'Leo', 'Noa', 'Ari', 'Sofia', ...EXTRA_NAMES];
  return Array.from({ length: count }, (_, i) => ({
    username: names[i % names.length],
    score: Math.max(0, 940 - i * 130),
    streak: Math.max(0, 5 - i),
    bestStreak: Math.max(1, 7 - i),
    correctCount: Math.max(0, 9 - i),
  }));
}
