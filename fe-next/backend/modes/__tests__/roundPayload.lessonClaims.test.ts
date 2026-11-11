import { vi, describe, it, expect } from 'vitest';

vi.mock('../../modules/gameStateManager', () => ({ getLeaderboard: vi.fn(() => []) }));
vi.mock('../../services/vocabQuizShell', () => ({ quizShellStartFor: vi.fn(() => ({})) }));
vi.mock('../../utils/socketHelpers.js', () => ({ broadcastToRoom: vi.fn(), getGameRoom: (c: string) => c }));

import { buildRoundPayload, type RoundPayloadKind } from '../roundPayload';
import { startLessonClaims, claimLessonWord } from '../../modules/lessonClaims';
import { resetScoresForNewRound } from '../../modules/scoreManager';

function raceGame() {
  const lessonClaims = startLessonClaims({
    placedWords: ['storm', 'shad'], language: 'en', gameMode: 'classic', playingHumans: 3, roundId: 4, teams: null,
  })!;
  const game = {
    letterGrid: [['A']], timerSeconds: 90, remainingTime: 42, language: 'en', minWordLength: 3,
    gameSessionId: 4, boardTheme: null, gameMode: 'classic', goldenLetters: [], playerWords: {}, isPaused: false,
    lessonClaims,
    // The round-start snapshot: claims made later must not be read from here.
    classroomRoundExtras: { accessibility: { largeText: true } },
  } as any;
  return game;
}

describe('buildRoundPayload lesson claims', () => {
  it('Given a claim made mid-round, When a student reconnects, late-joins or recovers, Then each payload carries the live claim list identically', () => {
    const game = raceGame();
    claimLessonWord(game.lessonClaims, { word: 'storm', username: 'Noa', fromLesson: true, roundId: 4, inProgress: true });
    const kinds: RoundPayloadKind[] = ['reconnect', 'lateJoin', 'recovery', 'retry', 'start'];
    const lists = kinds.map((kind) => buildRoundPayload('G', game, { kind, username: 'Dana' }).lessonClaims);
    expect((lists[0] as { claimedCount: number }).claimedCount).toBe(1);
    for (const list of lists) expect(list).toEqual(lists[0]);
  });

  it('Given stale extras holding an old claim list, When a payload is built, Then the live list wins', () => {
    const game = raceGame();
    claimLessonWord(game.lessonClaims, { word: 'shad', username: 'Noa', fromLesson: true, roundId: 4, inProgress: true });
    const p = buildRoundPayload('G', game, { kind: 'retry', extras: { lessonClaims: { claimedCount: 0 } } });
    expect((p.lessonClaims as { claimedCount: number }).claimedCount).toBe(1);
  });

  it('Given a round with no race, When a payload is built, Then it carries no lessonClaims field', () => {
    const game = { ...raceGame(), lessonClaims: null };
    expect(buildRoundPayload('G', game, { kind: 'start' })).not.toHaveProperty('lessonClaims');
  });
});

describe('resetScoresForNewRound', () => {
  it.each(['classic', 'blast', 'word-hunt', 'wheel-rush'])('Given a %s round with claims, When the next round resets, Then the claims are gone', (gameMode) => {
    const game = { ...raceGame(), gameMode, users: { Noa: {} }, playerScores: {}, playerWords: {} };
    resetScoresForNewRound(game);
    expect(game.lessonClaims).toBeNull();
  });
});
