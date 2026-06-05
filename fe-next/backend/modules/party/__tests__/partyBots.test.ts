import { describe, it, expect } from 'vitest';
import {
  decideCaptionBotAction,
  decideShadowBotAction,
  decidePixelBotAction,
  makeBotPlayers,
  SOLO_FILL_TARGET,
} from '../partyBots';

// Bots are dumb: one pure (state, botId) -> action|null function per game.
// These tests pin the decision logic against constructed engine state.

describe('partyBots — caption decider', () => {
  function captionState(over: Record<string, unknown> = {}) {
    return {
      currentRound: 1,
      totalRounds: 7,
      scores: new Map<string, number>(),
      playerUsernames: new Map([
        ['human', 'Human'],
        ['bot_a', 'Bot A'],
        ['bot_b', 'Bot B'],
      ]),
      rounds: [
        {
          phase: 'writing',
          submissions: new Map(),
          votes: new Map(),
          laughs: new Map(),
          ...over,
        },
      ],
    } as any;
  }

  it('writes a non-empty caption when in writing phase and not yet submitted', () => {
    const action = decideCaptionBotAction(captionState(), 'bot_a');
    expect(action).toEqual({ kind: 'caption', text: expect.any(String) });
    expect((action as { text: string }).text.length).toBeGreaterThan(0);
  });

  it('returns null when the bot already submitted a caption', () => {
    const submissions = new Map([
      ['s1', { id: 's1', socketId: 'bot_a', username: 'Bot A', text: 'hi', submittedAt: 0 }],
    ]);
    expect(decideCaptionBotAction(captionState({ submissions }), 'bot_a')).toBeNull();
  });

  it('votes for a submission that is NOT its own during voting', () => {
    const submissions = new Map([
      ['s1', { id: 's1', socketId: 'bot_a', username: 'Bot A', text: 'a', submittedAt: 0 }],
      ['s2', { id: 's2', socketId: 'human', username: 'Human', text: 'b', submittedAt: 0 }],
    ]);
    const action = decideCaptionBotAction(
      captionState({ phase: 'voting', submissions }),
      'bot_a',
    );
    expect(action).toEqual({ kind: 'caption-vote', submissionId: 's2' });
  });

  it('returns null in voting once the bot already voted', () => {
    const submissions = new Map([
      ['s1', { id: 's1', socketId: 'bot_a', username: 'Bot A', text: 'a', submittedAt: 0 }],
      ['s2', { id: 's2', socketId: 'human', username: 'Human', text: 'b', submittedAt: 0 }],
    ]);
    const votes = new Map([['bot_a', 's2']]);
    expect(
      decideCaptionBotAction(captionState({ phase: 'voting', submissions, votes }), 'bot_a'),
    ).toBeNull();
  });

  it('does nothing during crown/lineup', () => {
    expect(decideCaptionBotAction(captionState({ phase: 'crown' }), 'bot_a')).toBeNull();
    expect(decideCaptionBotAction(captionState({ phase: 'lineup' }), 'bot_a')).toBeNull();
  });
});

describe('partyBots — shadow decider', () => {
  function shadowState(over: Record<string, unknown> = {}) {
    return {
      phase: 'night',
      round: 1,
      maxRounds: 4,
      roles: new Map([
        ['human', 'citizen'],
        ['bot_a', 'shadow'],
        ['bot_b', 'seer'],
        ['bot_c', 'citizen'],
      ]),
      alivePlayers: new Set(['human', 'bot_a', 'bot_b', 'bot_c']),
      playerUsernames: new Map([
        ['human', 'Human'],
        ['bot_a', 'Bot A'],
        ['bot_b', 'Bot B'],
        ['bot_c', 'Bot C'],
      ]),
      usernameToSocket: new Map([
        ['Human', 'human'],
        ['Bot A', 'bot_a'],
        ['Bot B', 'bot_b'],
        ['Bot C', 'bot_c'],
      ]),
      nightActions: { shadowTarget: null, shadowVotes: new Map(), seerTarget: null, seerResult: null, medicTarget: null },
      votes: new Map(),
      ...over,
    } as any;
  }

  it('shadow bot targets a live player that is not itself at night', () => {
    const action = decideShadowBotAction(shadowState(), 'bot_a');
    expect(action?.kind).toBe('shadow-night');
    const target = (action as { targetUsername: string }).targetUsername;
    expect(['Human', 'Bot B', 'Bot C']).toContain(target);
    expect(target).not.toBe('Bot A');
  });

  it('citizen bot does nothing at night', () => {
    expect(decideShadowBotAction(shadowState(), 'human')).toBeNull();
  });

  it('seer bot investigates a live non-self player at night', () => {
    const action = decideShadowBotAction(shadowState(), 'bot_b');
    expect(action?.kind).toBe('shadow-night');
    expect((action as { targetUsername: string }).targetUsername).not.toBe('Bot B');
  });

  it('returns null once a shadow already submitted its night vote', () => {
    const nightActions = { shadowTarget: null, shadowVotes: new Map([['bot_a', 'Human']]), seerTarget: null, seerResult: null, medicTarget: null };
    expect(decideShadowBotAction(shadowState({ nightActions }), 'bot_a')).toBeNull();
  });

  it('votes for a live non-self player (or skip) during trial', () => {
    const action = decideShadowBotAction(shadowState({ phase: 'trial' }), 'bot_a');
    expect(action?.kind).toBe('shadow-vote');
    const target = (action as { targetUsername: string }).targetUsername;
    expect(['Human', 'Bot B', 'Bot C', 'skip']).toContain(target);
    expect(target).not.toBe('Bot A');
  });

  it('returns null once the bot already voted in trial', () => {
    const votes = new Map([['bot_a', 'Human']]);
    expect(decideShadowBotAction(shadowState({ phase: 'trial', votes }), 'bot_a')).toBeNull();
  });
});

describe('partyBots — pixel decider (showdown)', () => {
  // Solo pixel runs in SHOWDOWN mode: canvases + votes keyed by socketId, so
  // bot decisions are trivially correct (no telephone chain-rotation to track).
  function pixelState(over: Record<string, unknown> = {}) {
    return {
      currentRound: 1,
      totalRounds: 5,
      mode: 'showdown',
      scores: new Map<string, number>(),
      playerUsernames: new Map([
        ['human', 'Human'],
        ['bot_a', 'Bot A'],
        ['bot_b', 'Bot B'],
      ]),
      playerOrder: ['human', 'bot_a', 'bot_b'],
      rounds: [
        {
          mode: 'showdown',
          phase: 'showdown-draw',
          prompt: 'cat',
          canvases: new Map(),
          votes: new Map(),
          timer: null,
          ...over,
        },
      ],
    } as any;
  }

  it('draws a stub canvas (array of strokes) when in showdown-draw and not yet drawn', () => {
    const action = decidePixelBotAction(pixelState(), 'bot_a');
    expect(action?.kind).toBe('pixel-showdown-draw');
    expect(Array.isArray((action as { strokes: unknown }).strokes)).toBe(true);
  });

  it('returns null once the bot already drew', () => {
    const canvases = new Map([['bot_a', []]]);
    expect(decidePixelBotAction(pixelState({ canvases }), 'bot_a')).toBeNull();
  });

  it('votes best+funniest for non-self players in showdown-vote', () => {
    const action = decidePixelBotAction(pixelState({ phase: 'showdown-vote' }), 'bot_a');
    expect(action?.kind).toBe('pixel-showdown-vote');
    const { best, funniest } = action as { best: string; funniest: string };
    expect(best).not.toBe('bot_a');
    expect(funniest).not.toBe('bot_a');
    expect(['human', 'bot_b']).toContain(best);
  });

  it('returns null once the bot already voted in showdown', () => {
    const votes = new Map([['bot_a', { best: 'human', funniest: 'bot_b' }]]);
    expect(decidePixelBotAction(pixelState({ phase: 'showdown-vote', votes }), 'bot_a')).toBeNull();
  });
});

describe('partyBots — fill helpers', () => {
  it('exposes a per-game solo fill target (shadow needs 6 to avoid night-1 evil sweep)', () => {
    expect(SOLO_FILL_TARGET['caption-clash']).toBeGreaterThanOrEqual(3);
    expect(SOLO_FILL_TARGET['pixel-clash']).toBeGreaterThanOrEqual(3);
    expect(SOLO_FILL_TARGET['shadow-clash']).toBeGreaterThanOrEqual(6);
  });

  it('makes N bot players with unique bot_ ids and isBot flag', () => {
    const bots = makeBotPlayers(3);
    expect(bots).toHaveLength(3);
    for (const b of bots) {
      expect(b.socketId.startsWith('bot_')).toBe(true);
      expect(b.isBot).toBe(true);
      expect(b.isHost).toBe(false);
      expect(typeof b.username).toBe('string');
    }
    expect(new Set(bots.map((b) => b.socketId)).size).toBe(3);
  });
});
