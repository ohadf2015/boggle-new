import { beforeEach, describe, expect, it, vi } from 'vitest';

const started = vi.hoisted(() => vi.fn());

vi.mock('../classModeBridgeTelemetry', () => ({
  trackSecondSessionStarted: (...args: unknown[]) => started(...args),
}));

import { beginClassModeBridgeSession } from '../classModeBridgeStart';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';

function memoryStorage() {
  const bag = new Map<string, string>();
  return {
    getItem: (key: string) => bag.get(key) ?? null,
    setItem: (key: string, value: string) => { bag.set(key, value); },
  };
}

describe('beginClassModeBridgeSession', () => {
  beforeEach(() => started.mockClear());

  it('given an accepted solo-daily tap, when the classroom handoff runs, then the second session starts once and keeps the class', () => {
    const storage = memoryStorage();
    const search = `class_id=${CLASS_ID}&mode=solo_daily&rank=2`;
    const href = beginClassModeBridgeSession(search, 'en', storage);
    expect(href).toBe(`/en/daily?academy=1&class_id=${CLASS_ID}&from=class_mode_bridge`);
    expect(started).toHaveBeenCalledTimes(1);
    expect(started).toHaveBeenCalledWith({ class_id: CLASS_ID, mode: 'solo_daily' });
    expect(JSON.parse(storage.getItem('lc.classModeBridge') || '')).toMatchObject({ classId: CLASS_ID, mode: 'solo_daily' });

    expect(beginClassModeBridgeSession(search, 'en', storage)).toBe(href);
    expect(started).toHaveBeenCalledTimes(1);
  });

  it('does not start a session for a handoff that is not a class', () => {
    expect(beginClassModeBridgeSession('mode=quick_play', 'en', memoryStorage())).toBeNull();
    expect(started).not.toHaveBeenCalled();
  });
});
