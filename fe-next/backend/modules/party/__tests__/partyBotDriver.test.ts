import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the engines so we can assert the driver dispatches the right submit fn
// with the right argument order (the real risk — e.g. submitShowdownVote takes
// no `io`, shadow submitVote is aliased).
vi.mock('../captionClashEngine', () => ({
  getCaptionGameState: vi.fn(),
  submitCaption: vi.fn(),
  submitVote: vi.fn(),
}));
vi.mock('../pixelClashEngine', () => ({
  getPixelGameState: vi.fn(),
  submitShowdownCanvas: vi.fn(),
  submitShowdownVote: vi.fn(),
}));
vi.mock('../shadowClashEngine', () => ({
  getShadowGameState: vi.fn(),
  submitNightAction: vi.fn(),
  submitVote: vi.fn(),
}));

import { runPartyBotTick } from '../partyBots';
import * as caption from '../captionClashEngine';
import * as pixel from '../pixelClashEngine';
import * as shadow from '../shadowClashEngine';

const io = {} as never;

beforeEach(() => vi.clearAllMocks());

describe('runPartyBotTick — caption dispatch', () => {
  it('calls submitCaption(io, roomCode, botId, text) during writing', () => {
    vi.mocked(caption.getCaptionGameState).mockReturnValue({
      currentRound: 1,
      totalRounds: 7,
      rounds: [{ phase: 'writing', submissions: new Map(), votes: new Map() }],
    } as never);

    runPartyBotTick(io, 'ROOM', 'caption-clash', ['bot_a']);

    expect(caption.submitCaption).toHaveBeenCalledWith(io, 'ROOM', 'bot_a', expect.any(String));
  });

  it('returns true (over) when the engine state is gone', () => {
    vi.mocked(caption.getCaptionGameState).mockReturnValue(undefined);
    expect(runPartyBotTick(io, 'ROOM', 'caption-clash', ['bot_a'])).toBe(true);
  });
});

describe('runPartyBotTick — pixel showdown dispatch', () => {
  it('calls submitShowdownVote(roomCode, botId, best, funniest) WITHOUT io', () => {
    vi.mocked(pixel.getPixelGameState).mockReturnValue({
      currentRound: 1,
      totalRounds: 5,
      playerOrder: ['human', 'bot_a', 'bot_b'],
      rounds: [{ phase: 'showdown-vote', canvases: new Map(), votes: new Map() }],
    } as never);

    runPartyBotTick(io, 'ROOM', 'pixel-clash', ['bot_a']);

    expect(pixel.submitShowdownVote).toHaveBeenCalledTimes(1);
    const args = vi.mocked(pixel.submitShowdownVote).mock.calls[0];
    expect(args[0]).toBe('ROOM'); // roomCode first, NOT io
    expect(args[1]).toBe('bot_a');
  });
});

describe('runPartyBotTick — shadow dispatch', () => {
  it('calls submitNightAction(io, roomCode, botId, target) for a shadow at night', () => {
    vi.mocked(shadow.getShadowGameState).mockReturnValue({
      phase: 'night',
      roles: new Map([['bot_a', 'shadow'], ['human', 'citizen']]),
      alivePlayers: new Set(['bot_a', 'human']),
      playerUsernames: new Map([['bot_a', 'Bot A'], ['human', 'Human']]),
      usernameToSocket: new Map(),
      nightActions: { shadowVotes: new Map(), seerTarget: null, medicTarget: null },
      votes: new Map(),
    } as never);

    runPartyBotTick(io, 'ROOM', 'shadow-clash', ['bot_a']);

    expect(shadow.submitNightAction).toHaveBeenCalledWith(io, 'ROOM', 'bot_a', 'Human');
  });

  it('returns true (over) when shadow phase is game-over', () => {
    vi.mocked(shadow.getShadowGameState).mockReturnValue({ phase: 'game-over' } as never);
    expect(runPartyBotTick(io, 'ROOM', 'shadow-clash', ['bot_a'])).toBe(true);
  });
});
