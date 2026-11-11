import { vi, describe, it, expect } from 'vitest';

vi.mock('../../modules/gameStateManager', () => ({ getLeaderboard: vi.fn(() => []) }));
vi.mock('../../services/vocabQuizShell', () => ({ quizShellStartFor: vi.fn(() => ({})) }));
vi.mock('../../utils/socketHelpers.js', () => ({ broadcastToRoom: vi.fn(), getGameRoom: (c: string) => c }));

import { buildRoundPayload, type RoundPayloadKind } from '../roundPayload';
import { resetRivalsForNewRound } from '../../modules/rivalPairs';

function duelGame(enabled: boolean) {
  const game = {
    letterGrid: [['A']], timerSeconds: 90, remainingTime: 42, language: 'en', minWordLength: 3,
    gameSessionId: 2, boardTheme: null, gameMode: 'classic', goldenLetters: [], playerWords: {}, isPaused: false,
    users: { Ana: { socketId: 's-ana' }, Ben: { socketId: 's-ben' } },
    playerScores: { Ana: 5, Ben: 9 },
  } as any;
  resetRivalsForNewRound(game, { enabled, leaderboardHidden: false, mode: 'classic', seed: 'x', abilities: {}, teams: [] });
  return game;
}

describe('buildRoundPayload rival field', () => {
  it.each<RoundPayloadKind>(['reconnect', 'lateJoin', 'recovery', 'retry'])('Given a live duel, When a %s payload is built for a student, Then it names their rival and both scores', (kind) => {
    const p = buildRoundPayload('G', duelGame(true), { kind, username: 'Ana' });
    expect(p.rival).toMatchObject({ rivalName: 'Ben', myScore: 5, rivalScore: 9 });
  });

  it('Given rivalry off, When a payload is built, Then it carries no rival field', () => {
    expect(buildRoundPayload('G', duelGame(false), { kind: 'reconnect', username: 'Ana' })).not.toHaveProperty('rival');
  });
});
