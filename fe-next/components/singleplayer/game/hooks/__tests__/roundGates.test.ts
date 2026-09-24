import { describe, it, expect } from 'vitest';
import { roundEventsEnabled, startsBehindGate } from '../roundGates';

describe('roundEventsEnabled', () => {
  it('keeps earthquake/fire-round out of a first-ever game', () => {
    // A brand-new player learning the board should not have it replaced mid-round.
    expect(roundEventsEnabled('solo-bots', true)).toBe(false);
  });
  it('runs events for returning players', () => {
    expect(roundEventsEnabled('solo-bots', false)).toBe(true);
    expect(roundEventsEnabled('challenge', false)).toBe(true);
  });
  it('never runs events in practice', () => {
    expect(roundEventsEnabled('practice', false)).toBe(false);
  });
});

describe('startsBehindGate', () => {
  it('timed rounds wait for the player', () => {
    expect(startsBehindGate('solo-bots')).toBe(true);
    expect(startsBehindGate('challenge')).toBe(true);
  });
  it('practice is untimed and starts straight away', () => {
    expect(startsBehindGate('practice')).toBe(false);
  });
});
