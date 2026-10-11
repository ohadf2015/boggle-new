import { describe, it, expect } from 'vitest';
import {
  DAILY_MODES,
  pickPrimaryMode,
  pickNextUnplayedMode,
  requiredDailyModes,
  type DailyModePlayState,
} from '@/lib/dailyModes';

const fresh: DailyModePlayState = { wordHunt: 'new', wordWheel: 'new', wordTower: false, connections: false };

describe('daily mode order — Word Tower last and optional', () => {
  it('Given the registry, When listed, Then Word Tower is the last daily mode', () => {
    expect(DAILY_MODES.map((m) => m.id)).toEqual(['word-hunt', 'word-wheel', 'connections', 'word-tower']);
  });

  it('Given the registry, When asking which modes complete the day, Then Word Tower is not required', () => {
    expect(requiredDailyModes(DAILY_MODES).map((m) => m.id)).toEqual(['word-hunt', 'word-wheel', 'connections']);
    expect(DAILY_MODES.find((m) => m.id === 'word-tower')!.optional).toBe(true);
  });

  it('Given Hunt and Wheel are done, When picking the hero, Then Connections comes before Word Tower', () => {
    expect(pickPrimaryMode({ ...fresh, wordHunt: 'won', wordWheel: 'played' })).toBe('connections');
  });

  it('Given every required mode is done, When picking the hero, Then the optional Word Tower is offered', () => {
    expect(pickPrimaryMode({ wordHunt: 'won', wordWheel: 'played', wordTower: false, connections: true })).toBe('word-tower');
  });

  it('Given the Wheel just finished, When handing off, Then the next quest is Connections, not Word Tower', () => {
    expect(pickNextUnplayedMode({ ...fresh, wordHunt: 'won', wordWheel: 'played' }, 'word-wheel')).toBe('connections');
  });

  it('Given Connections just finished, When handing off, Then the optional Word Tower is next', () => {
    expect(
      pickNextUnplayedMode({ wordHunt: 'won', wordWheel: 'played', wordTower: false, connections: true }, 'connections'),
    ).toBe('word-tower');
  });
});
