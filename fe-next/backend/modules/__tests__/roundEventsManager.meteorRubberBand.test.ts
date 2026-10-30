import { vi, type Mock } from 'vitest';
import type { GameState } from '../gameState/types';

const { timers, cleanup } = vi.hoisted(() => ({
  timers: { setTimeout: vi.fn(), clearTimersWithPrefix: vi.fn() },
  cleanup: { end: [] as Array<(e: { gameCode: string }) => void>, reset: [] as Array<(e: { gameCode: string }) => void> },
}));

vi.mock('../gameStateManager', () => ({ getGame: vi.fn(), updateGame: vi.fn() }));
vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: vi.fn(),
  getGameRoom: vi.fn((gc: string) => `room:${gc}`),
}));
vi.mock('../../utils/timerManager', () => ({ __esModule: true, default: timers }));
vi.mock('../../utils/logger', () => ({ __esModule: true, default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../events/gameCleanup', () => {
  const emitter = {
    onGameEnd: vi.fn((fn) => cleanup.end.push(fn)),
    onGameReset: vi.fn((fn) => cleanup.reset.push(fn)),
  };
  return { gameCleanupEmitter: emitter, default: emitter };
});
vi.mock('../../handlers/earthquakeHandler', () => ({ executeEarthquakeSequence: vi.fn() }));
vi.mock('../boardWordCount', () => ({ emitTotalBoardWords: vi.fn(async () => {}) }));

import { scheduleRoundEvent } from '../roundEventsManager';
import { getGame, updateGame } from '../gameStateManager';
import { broadcastToRoom } from '../../utils/socketHelpers';
import { executeEarthquakeSequence } from '../../handlers/earthquakeHandler';
import { emitTotalBoardWords } from '../boardWordCount';
import { seededRng, pickWeightedCatalyst } from '../roundEventPick';

const io = {} as Parameters<typeof scheduleRoundEvent>[0];

function makeGame(overrides: Record<string, unknown> = {}): GameState {
  return {
    gameCode: 'MET1',
    gameSessionId: 3,
    gameState: 'in-progress',
    language: 'en',
    minWordLength: 3,
    modeHistory: ['classic', 'classic'],
    letterGrid: [['C', 'A', 'T'], ['D', 'O', 'G'], ['S', 'U', 'N']],
    goldenLetters: [],
    specialWords: [],
    users: { a: {}, b: {}, c: {} },
    playerScores: { a: 0, b: 0, c: 0 },
    ...overrides,
  } as unknown as GameState;
}

function timerCb(suffix: string): () => void {
  const call = timers.setTimeout.mock.calls.find((c: unknown[]) => String(c[0]).endsWith(suffix));
  return call![1] as () => void;
}

function startedEventType(): string | undefined {
  const warn = (broadcastToRoom as Mock).mock.calls.find((c: unknown[]) => c[2] === 'roundEventWarning');
  if (warn) return warn[3].eventType;
  return (executeEarthquakeSequence as Mock).mock.calls.length > 0 ? 'earthquake' : undefined;
}

describe('roundEventsManager: meteor board update and rubber-band pick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function runMeteor(game: GameState): void {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    (getGame as Mock).mockReturnValue(game);
    scheduleRoundEvent(io, 'MET1', game, 120);
    timerCb(':trigger')();
    timerCb(':start')();
  }

  it('meteor keeps letterPositions in step with the new grid', () => {
    const game = makeGame();
    runMeteor(game);

    const gridUpdate = (updateGame as Mock).mock.calls.find((c: unknown[]) => (c[1] as Record<string, unknown>).letterGrid);
    expect(gridUpdate).toBeDefined();
    const { letterGrid, letterPositions } = gridUpdate![1] as { letterGrid: string[][]; letterPositions: Map<string, unknown> };
    expect(letterPositions).toBeDefined();
    for (const row of letterGrid) for (const ch of row) {
      expect(letterPositions.has(ch.toLowerCase()) || letterPositions.has(ch)).toBe(true);
    }
  });

  it('meteor stores its tiles so words using them can be paid', () => {
    const game = makeGame();
    runMeteor(game);
    expect((game as GameState & { meteorTiles?: unknown[] }).meteorTiles?.length).toBeGreaterThan(0);
  });

  it('meteor drops letters from the board language, never a Latin letter onto a Hebrew board', () => {
    const grid = [['א', 'ב', 'ג'], ['ד', 'ה', 'ו'], ['ז', 'ח', 'ט']];
    const game = makeGame({ language: 'he', letterGrid: grid });
    runMeteor(game);
    const start = (broadcastToRoom as Mock).mock.calls.find((c: unknown[]) => c[2] === 'roundEventStart');
    const tiles = start![3].data.meteor.affectedTiles as Array<{ newLetter: string }>;
    const hebrew = new Set(grid.flat());
    for (const t of tiles) expect(hebrew.has(t.newLetter)).toBe(true);
  });

  it('meteor recounts board words and drops unfound special words that left the board', () => {
    const game = makeGame({
      specialWords: [{ word: 'ZZZZ' }, { word: 'CATS', foundBy: 'a' }],
    });
    runMeteor(game);
    expect(emitTotalBoardWords).toHaveBeenCalledWith(io, 'MET1', expect.any(Array), 'en', 3);
    expect(game.specialWords).toEqual([{ word: 'CATS', foundBy: 'a' }]);
  });

  it('when the leader runs away, the event is re-rolled from the round seed toward the board shuffle', () => {
    const game = makeGame({ playerScores: { a: 600, b: 120, c: 20 } });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    (getGame as Mock).mockReturnValue(game);

    scheduleRoundEvent(io, 'MET1', game, 120);
    timerCb(':trigger')();

    const expected = pickWeightedCatalyst(seededRng('3:2'), true);
    expect(startedEventType()).toBe(expected);
  });

  it('keeps the scheduled event when the race is close', () => {
    const game = makeGame({ playerScores: { a: 100, b: 90, c: 80 } });
    vi.spyOn(Math, 'random').mockReturnValue(0);
    (getGame as Mock).mockReturnValue(game);

    scheduleRoundEvent(io, 'MET1', game, 120);
    timerCb(':trigger')();

    expect(startedEventType()).toBe('blizzard');
  });

  it('clears event tiles when the round ends mid-event so they cannot leak into the next round', () => {
    const game = makeGame({ frozenTiles: [{ row: 0, col: 0 }], lightningTiles: [{ row: 0, col: 1 }], meteorTiles: [{ row: 1, col: 1 }] });
    (getGame as Mock).mockReturnValue(game);
    for (const fn of cleanup.end) fn({ gameCode: 'MET1' });
    const g = game as GameState & Record<string, unknown>;
    expect(g.frozenTiles).toBeUndefined();
    expect(g.lightningTiles).toBeUndefined();
    expect(g.meteorTiles).toBeUndefined();
  });
});
