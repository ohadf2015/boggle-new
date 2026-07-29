/**
 * shadowPhase — phone-side phase state machine for Shadow Clash.
 *
 * The bug this guards against: a player who is eliminated mid-game would have
 * their `eliminated` phase overwritten by the room-wide `discussion-start` /
 * `vote-start` broadcasts, handing a dead player a live "Call Vote" button and
 * ballot. Elimination must be TERMINAL — only the game-over event moves past it
 * (to the spectator "watching" screen).
 */

import { describe, it, expect } from 'vitest';
import { shadowPhaseReducer, type ShadowPhase } from '../shadowPhase';

describe('shadowPhaseReducer', () => {
  it('maps live events to their phase for a living player', () => {
    expect(shadowPhaseReducer('waiting', { type: 'role-assigned' })).toBe('role-reveal');
    expect(shadowPhaseReducer('role-reveal', { type: 'night-action' })).toBe('night-action');
    expect(shadowPhaseReducer('role-reveal', { type: 'night-action', waiting: true })).toBe('night-waiting');
    expect(shadowPhaseReducer('night-action', { type: 'seer-result' })).toBe('seer-result');
    expect(shadowPhaseReducer('night-action', { type: 'discussion-start' })).toBe('discussion');
    expect(shadowPhaseReducer('discussion', { type: 'vote-start' })).toBe('voting');
    expect(shadowPhaseReducer('voting', { type: 'voted' })).toBe('voted');
    expect(shadowPhaseReducer('voted', { type: 'game-over' })).toBe('watching');
  });

  it('makes elimination terminal — discussion/vote/night events do NOT revive a dead player', () => {
    const dead: ShadowPhase = 'eliminated';
    expect(shadowPhaseReducer(dead, { type: 'discussion-start' })).toBe('eliminated');
    expect(shadowPhaseReducer(dead, { type: 'vote-start' })).toBe('eliminated');
    expect(shadowPhaseReducer(dead, { type: 'night-action' })).toBe('eliminated');
    expect(shadowPhaseReducer(dead, { type: 'voted' })).toBe('eliminated');
    expect(shadowPhaseReducer(dead, { type: 'seer-result' })).toBe('eliminated');
  });

  it('lets an eliminated player advance only to the post-game watching screen', () => {
    expect(shadowPhaseReducer('eliminated', { type: 'game-over' })).toBe('watching');
  });

  it('keeps the post-game watching screen sticky against mid-game broadcasts', () => {
    expect(shadowPhaseReducer('watching', { type: 'discussion-start' })).toBe('watching');
    expect(shadowPhaseReducer('watching', { type: 'vote-start' })).toBe('watching');
  });

  it('lets a NEW game escape any terminal state (role-assigned is a new-game signal, not revival)', () => {
    // Otherwise a player who finished one game (eliminated/watching) would be
    // stuck on "Watch the TV!" forever when the host starts a second game.
    expect(shadowPhaseReducer('watching', { type: 'role-assigned' })).toBe('role-reveal');
    expect(shadowPhaseReducer('eliminated', { type: 'role-assigned' })).toBe('role-reveal');
  });

  it('transitions a living player into eliminated on the eliminated event', () => {
    expect(shadowPhaseReducer('discussion', { type: 'eliminated' })).toBe('eliminated');
  });

  it('is a no-op for an unknown event (returns current phase)', () => {
    // @ts-expect-error — exercising the runtime fallback for an unmapped event
    expect(shadowPhaseReducer('discussion', { type: 'nonsense' })).toBe('discussion');
  });
});
