import { describe, it, expect } from 'vitest';
import {
  RIVAL_PING_IDS,
  RIVAL_PINGS,
  isRivalPingId,
  getRivalPing,
  RIVAL_PING_DAILY_LIMIT,
  RIVAL_PING_PER_TARGET_WINDOW_MS,
  latestPingFrom,
  pingEntityType,
  pingIdFromEntityType,
} from '../pings';
import { pingFakeDb, has } from './pingFakeDb';

describe('rival ping catalog', () => {
  it('has eight canned pings, each with an emoji and a rivalPings text key', () => {
    expect(RIVAL_PING_IDS).toHaveLength(8);
    for (const id of RIVAL_PING_IDS) {
      const ping = RIVAL_PINGS[id];
      expect(ping.emoji.length).toBeGreaterThan(0);
      expect(ping.textKey).toBe(`rivalPings.ping.${id}`);
    }
  });

  it('accepts only known ids', () => {
    expect(isRivalPingId('gg')).toBe(true);
    expect(isRivalPingId('come_at_me')).toBe(true);
    expect(isRivalPingId('free text')).toBe(false);
    expect(isRivalPingId(undefined)).toBe(false);
    expect(isRivalPingId(42)).toBe(false);
    expect(isRivalPingId('__proto__')).toBe(false);
  });

  it('returns null for unknown ids', () => {
    expect(getRivalPing('nope')).toBeNull();
    expect(getRivalPing('rematch')?.id).toBe('rematch');
  });

  it('caps sends at 3 a day and 1 per target per 6 hours', () => {
    expect(RIVAL_PING_DAILY_LIMIT).toBe(3);
    expect(RIVAL_PING_PER_TARGET_WINDOW_MS).toBe(6 * 60 * 60 * 1000);
  });
});


describe('ping entity tag', () => {
  it('round-trips the ping id through related_entity_type', () => {
    expect(pingEntityType('gg')).toBe('rival_ping:gg');
    expect(pingIdFromEntityType('rival_ping:gg')).toBe('gg');
    expect(pingIdFromEntityType('rival_ping:hack')).toBeNull();
    expect(pingIdFromEntityType('gift')).toBeNull();
    expect(pingIdFromEntityType(null)).toBeNull();
  });
});

describe('latestPingFrom', () => {
  const ME = 'me-id';
  const THEM = 'them-id';

  it('returns the newest ping time from them to me, even once the toast marked it read', async () => {
    const d = pingFakeDb({ user_notifications: () => ({ data: { created_at: '2026-11-11T10:00:00Z' }, error: null }) });
    expect(await latestPingFrom(d.client, ME, THEM)).toBe('2026-11-11T10:00:00Z');
    const ops = d.calls[0].ops;
    expect(has(ops, 'eq', 'user_id', ME)).toBe(true);
    expect(has(ops, 'eq', 'sender_id', THEM)).toBe(true);
    expect(ops.some(([m, col]) => m === 'eq' && col === 'read')).toBe(false);
    expect(has(ops, 'like', 'related_entity_type', 'rival_ping:%')).toBe(true);
  });

  it('returns null when there is none or the lookup fails', async () => {
    const none = pingFakeDb({ user_notifications: () => ({ data: null, error: null }) });
    expect(await latestPingFrom(none.client, ME, THEM)).toBeNull();
    const broken = pingFakeDb({ user_notifications: () => ({ data: null, error: { message: 'x' } }) });
    expect(await latestPingFrom(broken.client, ME, THEM)).toBeNull();
  });
});
