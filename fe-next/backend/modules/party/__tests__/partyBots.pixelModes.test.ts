import { describe, it, expect } from 'vitest';
import { decidePixelBotAction } from '../partyBots';

// Telephone + relay bot decisions (solo mode rotation makes all 3 pixel modes
// bot-playable). Chain assignment is reconstructed from playerOrder + step.

function telephoneState(over: Record<string, unknown> = {}) {
  return {
    playerOrder: ['human', 'bot_a', 'bot_b'],
    rounds: [
      {
        phase: 'drawing',
        currentStepIndex: 1,
        chains: [
          { id: 'chain_human', steps: [{ playerId: 'human' }] },
          { id: 'chain_bot_a', steps: [{ playerId: 'bot_a' }] },
          { id: 'chain_bot_b', steps: [{ playerId: 'bot_b' }] },
        ],
        ...over,
      },
    ],
  } as never;
}

describe('decidePixelBotAction — telephone', () => {
  it('draws on its OWN chain at step 1 (array content)', () => {
    const a = decidePixelBotAction(telephoneState(), 'bot_a');
    expect(a?.kind).toBe('pixel-telephone-step');
    expect((a as { chainId: string }).chainId).toBe('chain_bot_a');
    expect(Array.isArray((a as { content: unknown }).content)).toBe(true);
  });

  it('returns null once it has added a step this round', () => {
    const s = telephoneState({
      chains: [
        { id: 'chain_human', steps: [{ playerId: 'human' }] },
        { id: 'chain_bot_a', steps: [{ playerId: 'bot_a' }, { playerId: 'bot_a' }] }, // 2 steps > step 1
        { id: 'chain_bot_b', steps: [{ playerId: 'bot_b' }] },
      ],
    });
    expect(decidePixelBotAction(s, 'bot_a')).toBeNull();
  });

  it('submits a string GUESS on an even step (guessing)', () => {
    const s = telephoneState({
      phase: 'guessing',
      currentStepIndex: 2,
      chains: [
        { id: 'chain_human', steps: [{ playerId: 'human' }, { playerId: 'bot_a' }] },
        { id: 'chain_bot_a', steps: [{ playerId: 'bot_a' }, { playerId: 'bot_b' }] },
        { id: 'chain_bot_b', steps: [{ playerId: 'bot_b' }, { playerId: 'human' }] },
      ],
    });
    const a = decidePixelBotAction(s, 'bot_a'); // i=1, step2 -> chainIdx (1+2)%3=0 = chain_human
    expect(a?.kind).toBe('pixel-telephone-step');
    expect((a as { chainId: string }).chainId).toBe('chain_human');
    expect(typeof (a as { content: unknown }).content).toBe('string');
  });
});

function relayState(phase: string, over: Record<string, unknown> = {}) {
  return {
    playerOrder: ['human', 'bot_a', 'bot_b'],
    rounds: [
      {
        phase,
        relay: { artistId: 'bot_a', originalDrawing: [], builderDrawings: new Map(), ...over },
      },
    ],
  } as never;
}

describe('decidePixelBotAction — relay', () => {
  it('the artist draws during relay-artist', () => {
    const a = decidePixelBotAction(relayState('relay-artist'), 'bot_a');
    expect(a?.kind).toBe('pixel-relay-artist');
  });

  it('non-artists do nothing during relay-artist', () => {
    expect(decidePixelBotAction(relayState('relay-artist'), 'bot_b')).toBeNull();
  });

  it('the artist already-drew returns null', () => {
    expect(decidePixelBotAction(relayState('relay-artist', { originalDrawing: [{ x: 1 }] }), 'bot_a')).toBeNull();
  });

  it('builders (not the artist) draw during relay-build', () => {
    const a = decidePixelBotAction(relayState('relay-build'), 'bot_b');
    expect(a?.kind).toBe('pixel-relay-builder');
    expect(decidePixelBotAction(relayState('relay-build'), 'bot_a')).toBeNull(); // artist doesn't build
  });

  it('a builder that already built returns null', () => {
    const s = relayState('relay-build', { builderDrawings: new Map([['bot_b', []]]) });
    expect(decidePixelBotAction(s, 'bot_b')).toBeNull();
  });
});
