/**
 * Live classroom Wordcraft — the socket seam.
 *
 * The manager tests pin the race arithmetic; these pin what the room sees:
 * scores land in the SAME aggregates every other classroom mode feeds (so the
 * leaderboard, podium and session totals work unchanged), the projector gets
 * its live placement beat, and a reconnecting student is handed their own
 * board back rather than a fresh one.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { PlacedTile, RackTile } from '@/lib/word-craft/types';

const { mockGame, mockIo, roomEmits, mockAddPlayerWord, mockUpdatePlayerScore, mockAddPlayerEventBonus, mockUsername } =
  vi.hoisted(() => {
    const roomEmits: { event: string; payload: unknown }[] = [];
    return {
      mockGame: { current: null as null | Record<string, unknown> },
      mockIo: {} as Record<string, unknown>,
      roomEmits,
      mockAddPlayerWord: vi.fn(),
      mockUpdatePlayerScore: vi.fn(),
      mockAddPlayerEventBonus: vi.fn(),
      mockUsername: { current: 'Ada' },
    };
  });

vi.mock('../../modules/gameStateManager.js', () => ({
  getGame: () => mockGame.current,
  getGameBySocketId: () => (mockGame.current ? (mockGame.current.gameCode as string) : null),
  getUsernameBySocketId: () => mockUsername.current,
}));
vi.mock('../../modules/scoreManager.js', () => ({
  addPlayerWord: mockAddPlayerWord,
  updatePlayerScore: mockUpdatePlayerScore,
  addPlayerEventBonus: mockAddPlayerEventBonus,
  getLeaderboard: () => [{ username: 'Ada', score: 12, wordCount: 1 }],
  getLeaderboardThrottled: (_g: unknown, _c: string, cb: (lb: unknown) => void) =>
    cb([{ username: 'Ada', score: 12, wordCount: 1 }]),
}));
vi.mock('../../dictionary.js', () => ({
  isDictionaryWord: (w: string) => ['cat', 'cats', 'at', 'scat'].includes(w.toLowerCase()),
}));
vi.mock('../../utils/socketHelpers.js', () => ({
  broadcastToRoom: (_io: unknown, _room: string, event: string, payload: unknown) => {
    roomEmits.push({ event, payload });
  },
  volatileBroadcastToRoom: (_io: unknown, _room: string, event: string, payload: unknown) => {
    roomEmits.push({ event, payload });
  },
  getGameRoom: (code: string) => `game:${code}`,
}));
vi.mock('../../utils/rateLimiter.js', () => ({ checkRateLimit: () => true }));
vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { registerWordcraftClassroomHandlers } from '../wordcraftClassroomHandler';
import { createWordcraftLiveSession, WORDCRAFT_LIVE_RACK_SIZE } from '../../modules/wordcraftClassroomManager';

type Listener = (data: unknown) => void;

function makeSocket(id = 's1') {
  const listeners: Record<string, Listener> = {};
  const emitted: { event: string; payload: unknown }[] = [];
  const socket = {
    id,
    on: (event: string, fn: Listener) => {
      listeners[event] = fn;
    },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
  };
  return { socket, listeners, emitted };
}

function makeGame(): Record<string, unknown> {
  const wordcraftState = createWordcraftLiveSession({
    gameCode: 'CRAFT1',
    vocabularyWords: ['cat', 'dog'],
    language: 'en',
    usernames: ['Ada'],
    seed: 'handler-seed',
  });
  return {
    gameCode: 'CRAFT1',
    gameState: 'in-progress',
    gameMode: 'wordcraft',
    language: 'en',
    users: { Ada: { username: 'Ada', isBot: false } },
    playerScores: { Ada: 0 },
    playerWords: {},
    playerWordDetails: {},
    playerAchievements: {},
    wordcraftState,
    startTime: Date.now(),
  };
}

function placeFromRack(rack: RackTile[], word: string, row = 4, col = 2): PlacedTile[] {
  const pool = rack.slice();
  const out: PlacedTile[] = [];
  for (const ch of word.toUpperCase()) {
    const i = pool.findIndex((t) => !t.isBlank && t.letter === ch);
    if (i < 0) throw new Error(`rack lacks ${ch}`);
    const t = pool.splice(i, 1)[0];
    out.push({ row, col: col + out.length, letter: t.letter, value: t.value, isBlank: t.isBlank, rackTileId: t.id });
  }
  return out;
}

describe('wordcraft:place', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roomEmits.length = 0;
    mockUsername.current = 'Ada';
    mockUpdatePlayerScore.mockImplementation(
      (g: { playerScores: Record<string, number> }, u: string, delta: number) => {
        g.playerScores[u] = (g.playerScores[u] ?? 0) + delta;
      },
    );
    mockGame.current = makeGame();
  });

  it('accepts a real move: personal result + snapshot, room activity beat, leaderboard', () => {
    const { socket, listeners, emitted } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);

    const state = (mockGame.current as { wordcraftState: ReturnType<typeof createWordcraftLiveSession> }).wordcraftState;
    const rack = state.players.Ada.rack;
    listeners['wordcraft:place']({ placements: placeFromRack(rack, 'CAT') });

    const result = emitted.find((e) => e.event === 'wordcraft:placeResult');
    expect(result?.payload).toMatchObject({ accepted: true });
    // The student's own board comes back straight away — no second round-trip.
    const snap = emitted.find((e) => e.event === 'wordcraft:state');
    expect(snap).toBeDefined();
    // The projector's live feed carries the word and its score.
    const activity = roomEmits.find((e) => e.event === 'wordcraft:activity');
    expect(activity?.payload).toMatchObject({ username: 'Ada', bingo: false });
    expect((activity?.payload as { words: { word: string }[] }).words.map((w) => w.word)).toContain('CAT');
    // The class leaderboard updates through the shared channel.
    expect(roomEmits.some((e) => e.event === 'updateLeaderboard')).toBe(true);
    // The score lands in the room aggregates the round-end path recomputes from.
    expect(mockAddPlayerWord).toHaveBeenCalled();
    const wordScore = mockAddPlayerWord.mock.calls
      .filter((c) => c[1] === 'Ada')
      .reduce((s, c) => s + ((c[3] as { score?: number })?.score ?? 0), 0);
    const liveDelta = mockUpdatePlayerScore.mock.calls
      .filter((c) => c[1] === 'Ada')
      .reduce((s, c) => s + (c[2] as number), 0);
    const eventBonus = mockAddPlayerEventBonus.mock.calls
      .filter((c) => c[1] === 'Ada')
      .reduce((s, c) => s + (c[2] as number), 0);
    // Live total == word-details total + event bonuses, or the podium and the
    // in-game leaderboard would tell two different stories (pitfall class 3).
    expect(liveDelta).toBe(wordScore + eventBonus);
    expect(liveDelta).toBeGreaterThan(0);
  });

  it('rejects a word the dictionary refuses — no score, no activity, no silent no-op', () => {
    const { socket, listeners, emitted } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    const state = (mockGame.current as { wordcraftState: ReturnType<typeof createWordcraftLiveSession> }).wordcraftState;

    // 'ACT' uses only dealt tiles but is neither a lesson target nor a
    // dictionary word — the rejection path.
    listeners['wordcraft:place']({ placements: placeFromRack(state.players.Ada.rack, 'ACT') });

    const result = emitted.find((e) => e.event === 'wordcraft:placeResult');
    expect(result?.payload).toMatchObject({ accepted: false, error: 'INVALID_WORD' });
    expect(mockUpdatePlayerScore).not.toHaveBeenCalled();
    expect(roomEmits.some((e) => e.event === 'wordcraft:activity')).toBe(false);
  });

  it('rejects forged tiles that never sat in the rack', () => {
    const { socket, listeners, emitted } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    listeners['wordcraft:place']({
      placements: [
        { row: 4, col: 2, letter: 'C', value: 3, isBlank: false, rackTileId: 't-999' },
        { row: 4, col: 3, letter: 'A', value: 1, isBlank: false, rackTileId: 't-998' },
      ],
    });
    expect(emitted.find((e) => e.event === 'wordcraft:placeResult')?.payload).toMatchObject({
      accepted: false,
      error: 'NOT_IN_RACK',
    });
  });

  it('ignores a placement in a room that is not running wordcraft', () => {
    (mockGame.current as { gameMode: string }).gameMode = 'classic';
    const { socket, listeners, emitted } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    listeners['wordcraft:place']({ placements: [] });
    expect(emitted).toHaveLength(0);
    expect(mockUpdatePlayerScore).not.toHaveBeenCalled();
  });
});

describe('wordcraft:requestState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roomEmits.length = 0;
    mockUsername.current = 'Ada';
    mockUpdatePlayerScore.mockImplementation(
      (g: { playerScores: Record<string, number> }, u: string, delta: number) => {
        g.playerScores[u] = (g.playerScores[u] ?? 0) + delta;
      },
    );
    mockGame.current = makeGame();
  });

  it('hands the student their own board — rack, cells, rival score, no bot rack', () => {
    const { socket, listeners, emitted } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    listeners['wordcraft:requestState']();

    const snap = emitted.find((e) => e.event === 'wordcraft:state');
    expect(snap).toBeDefined();
    const payload = snap!.payload as { rack: RackTile[]; botScore: number };
    expect(payload.rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
    expect(JSON.stringify(payload)).not.toContain('botRack');
  });

  it('seats a late joiner with a fresh deal instead of leaving them on a blank board', () => {
    mockUsername.current = 'Cid';
    const { socket, listeners, emitted } = makeSocket('s-late');
    const state = (mockGame.current as { wordcraftState: ReturnType<typeof createWordcraftLiveSession> }).wordcraftState;
    expect(state.players['Cid']).toBeUndefined();

    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    listeners['wordcraft:requestState']();

    expect(state.players['Cid']).toBeDefined();
    expect(state.players['Cid'].rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
    const snap = emitted.find((e) => e.event === 'wordcraft:state');
    expect((snap!.payload as { rack: RackTile[] }).rack).toHaveLength(WORDCRAFT_LIVE_RACK_SIZE);
  });

  it('returns the SAME board to a reconnecting student — their words survive the refresh', () => {
    const { socket, listeners, emitted } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    const state = (mockGame.current as { wordcraftState: ReturnType<typeof createWordcraftLiveSession> }).wordcraftState;
    listeners['wordcraft:place']({ placements: placeFromRack(state.players.Ada.rack, 'CAT') });
    emitted.length = 0;

    listeners['wordcraft:requestState']();
    const snap = emitted.find((e) => e.event === 'wordcraft:state');
    const payload = snap!.payload as { cells: { letter: string }[]; myScore: number };
    expect(payload.cells.some((c) => c.letter === 'C')).toBe(true);
    expect(payload.myScore).toBeGreaterThan(0);
  });
});

describe('wordcraft:projectorState — the spectator pull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roomEmits.length = 0;
    mockUsername.current = 'Ada';
    mockUpdatePlayerScore.mockImplementation(
      (g: { playerScores: Record<string, number> }, u: string, delta: number) => {
        g.playerScores[u] = (g.playerScores[u] ?? 0) + delta;
      },
    );
    mockGame.current = makeGame();
  });

  it('hands a spectator the checklist WITHOUT dealing them a seat', () => {
    mockUsername.current = 'Host';
    const { socket, listeners, emitted } = makeSocket('s-host');
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);

    listeners['wordcraft:projectorState']();

    const resp = emitted.find((e) => e.event === 'wordcraft:projectorState');
    expect(resp).toBeDefined();
    const payload = resp!.payload as { gameCode: string; boardSize: number; targets: { word: string; built: boolean }[] };
    expect(payload.gameCode).toBe('CRAFT1');
    expect(payload.targets.map((x) => x.word)).toEqual(['CAT', 'DOG']);
    expect(payload.targets.every((x) => !x.built)).toBe(true);
    // The pull must never deal the projector a board — it is a spectator.
    const state = (mockGame.current as { wordcraftState: ReturnType<typeof createWordcraftLiveSession> }).wordcraftState;
    expect(state.players['Host']).toBeUndefined();
  });

  it('a mid-race reload gets the truth — targets the class already built come back ticked', () => {
    // Ada builds CAT while the projector is away.
    const { socket, listeners } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    const state = (mockGame.current as { wordcraftState: ReturnType<typeof createWordcraftLiveSession> }).wordcraftState;
    listeners['wordcraft:place']({ placements: placeFromRack(state.players.Ada.rack, 'CAT') });

    mockUsername.current = 'Host';
    const proj = makeSocket('s-host');
    registerWordcraftClassroomHandlers(mockIo as never, proj.socket as never);
    proj.listeners['wordcraft:projectorState']();

    const resp = proj.emitted.find((e) => e.event === 'wordcraft:projectorState');
    const targets = (resp!.payload as { targets: { word: string; built: boolean }[] }).targets;
    expect(targets.find((x) => x.word === 'CAT')?.built).toBe(true);
    expect(targets.find((x) => x.word === 'DOG')?.built).toBe(false);
  });

  it('ignores the pull outside a wordcraft room', () => {
    mockGame.current = { ...makeGame(), gameMode: 'classic' };
    const { socket, listeners, emitted } = makeSocket();
    registerWordcraftClassroomHandlers(mockIo as never, socket as never);
    listeners['wordcraft:projectorState']();
    expect(emitted.some((e) => e.event === 'wordcraft:projectorState')).toBe(false);
  });
});
