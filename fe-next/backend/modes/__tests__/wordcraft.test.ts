/**
 * The wordcraft entry in the mode registry (backend/modes).
 *
 * The registry contract does the heavy lifting (initRound → session on the
 * game, afterStart → the mount broadcast, onLateJoin → seat the arrival,
 * resultsSummary → the projector's target ticker). These tests pin that the
 * wordcraft module honours each hook — and that a crafted wordcraft start in
 * a non-classroom room downgrades instead of dealing a lesson-less race.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { wordcraftMode } from '../wordcraft';
import { getGameModeModule, getGameModeRules } from '../index';
import { WORDCRAFT_LIVE_RACK_SIZE } from '../../modules/wordcraftClassroomManager';
import type { GameState } from '../../modules/gameState/types';

function makeGame(): GameState {
  return { gameCode: 'CRAFT1', gameSessionId: 3 } as unknown as GameState;
}

const CLASSROOM = {
  gameCode: 'CRAFT1',
  vocabularyWords: ['cat', 'dog'],
  settings: { gameMode: 'wordcraft' },
} as never;

function ctx(game: GameState, classroomGame: unknown = CLASSROOM) {
  return {
    io: {} as never,
    gameCode: 'CRAFT1',
    game,
    language: 'en' as const,
    letterGrid: [['A']],
    gridRows: 1,
    gridCols: 1,
    playerUsernames: ['Ada', 'Ben'],
    humanUsernames: ['Ada', 'Ben'],
    vocabToEmbed: ['CAT', 'DOG'],
    classroomGame: classroomGame as never,
  };
}

describe('wordcraftMode registry entry', () => {
  it('is the module the registry hands out for wordcraft', () => {
    expect(getGameModeModule('wordcraft')).toBe(wordcraftMode);
  });

  it('plays human-only: classic bots have no wordcraft move logic', () => {
    expect(getGameModeRules('wordcraft').humanOnly).toBe(true);
  });

  it('banks shared lesson words at full value — it is a race, not a shared board', () => {
    const rules = getGameModeRules('wordcraft');
    expect(rules.duplicatesAllowed).toBe(true);
    expect(rules.rarityScoring).toBe(false);
  });
});

describe('initRound', () => {
  it('deals per-student race sessions onto the game', () => {
    const game = makeGame();
    const result = wordcraftMode.initRound!(ctx(game));
    expect(result).toBeUndefined();
    expect(game.wordcraftState).toBeDefined();
    expect(Object.keys(game.wordcraftState!.players)).toEqual(['Ada', 'Ben']);
    expect(game.wordcraftState!.players.Ada.rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
  });

  it('downgrades to classic outside a classroom (crafted payload)', () => {
    const game = makeGame();
    const result = wordcraftMode.initRound!(ctx(game, null)) as { downgradeTo?: string };
    expect(result?.downgradeTo).toBe('classic');
    expect(game.wordcraftState).toBeUndefined();
  });

  it('downgrades when the classroom record names another mode (record wins)', () => {
    const game = makeGame();
    const record = { ...CLASSROOM, settings: { gameMode: 'blast' } };
    const result = wordcraftMode.initRound!(ctx(game, record)) as { downgradeTo?: string };
    expect(result?.downgradeTo).toBe('blast');
    expect(game.wordcraftState).toBeUndefined();
  });
});

describe('afterStart', () => {
  it('broadcasts the race init so mounted views know the board and targets', () => {
    const game = makeGame();
    wordcraftMode.initRound!(ctx(game));
    const emits: { event: string; payload: unknown }[] = [];
    const io = {
      to: () => ({ emit: (event: string, payload: unknown) => emits.push({ event, payload }) }),
    };
    wordcraftMode.afterStart!(io as never, 'CRAFT1', game);
    const init = emits.find((e) => e.event === 'wordcraft:init');
    expect(init).toBeDefined();
    expect(init!.payload).toMatchObject({ gameCode: 'CRAFT1', boardSize: 9 });
    expect((init!.payload as { targets: string[] }).targets).toContain('CAT');
  });
});

describe('onLateJoin', () => {
  it('seats a student who arrives mid-round with a fresh deal', () => {
    const game = makeGame();
    wordcraftMode.initRound!(ctx(game));
    wordcraftMode.onLateJoin!(game, 'Cid');
    expect(game.wordcraftState!.players.Cid.rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
  });
});

describe('resultsSummary', () => {
  it('carries the class target progress for the projector recap', () => {
    const game = makeGame();
    wordcraftMode.initRound!(ctx(game));
    const summary = wordcraftMode.resultsSummary!(game) as {
      wordcraftSummary: { targets: { target: string; builtBy: string[] }[] };
    };
    expect(summary.wordcraftSummary.targets.map((t) => t.target)).toContain('CAT');
  });
});
