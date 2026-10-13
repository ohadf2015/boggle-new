import { describe, it, expect } from 'vitest';
import { DAILY_MODES, MODE_PRIORITY, pickPrimaryMode, pickNextUnplayedMode, requiredDailyModes, type DailyModePlayState } from '@/lib/dailyModes';

const fresh: DailyModePlayState = { wordHunt: 'new', wordWheel: 'new', wordTower: false, connections: false };

describe('daily flow: wheel → hunt → connections → tower', () => {
  it('lists the four challenges in play order', () => {
    expect(DAILY_MODES.map((m) => m.id)).toEqual(['word-wheel', 'word-hunt', 'connections', 'word-tower']);
    expect(MODE_PRIORITY).toEqual(['word-wheel', 'word-hunt', 'connections', 'word-tower']);
  });
  it('only word wheel and word hunt are required; connections and tower are optional', () => {
    expect(requiredDailyModes(DAILY_MODES).map((m) => m.id)).toEqual(['word-wheel', 'word-hunt']);
    expect(DAILY_MODES.filter((m) => m.optional).map((m) => m.id)).toEqual(['connections', 'word-tower']);
  });
  it('starts the day on the word wheel, then the hunt', () => {
    expect(pickPrimaryMode(fresh)).toBe('word-wheel');
    expect(pickPrimaryMode({ ...fresh, wordWheel: 'played' })).toBe('word-hunt');
    expect(pickPrimaryMode({ ...fresh, wordWheel: 'played', wordHunt: 'won' })).toBe('connections');
    expect(pickPrimaryMode({ ...fresh, wordWheel: 'played', wordHunt: 'won', connections: true })).toBe('word-tower');
  });
  it('hands off along the chain and lets optional steps be skipped', () => {
    expect(pickNextUnplayedMode(fresh, 'word-wheel')).toBe('word-hunt');
    expect(pickNextUnplayedMode({ ...fresh, wordWheel: 'played', wordHunt: 'won' }, 'word-hunt')).toBe('connections');
    // skipping connections (never played) still offers word tower after it
    expect(pickNextUnplayedMode({ ...fresh, wordWheel: 'played', wordHunt: 'won' }, 'connections')).toBe('word-tower');
  });
});
