import { describe, it, expect, beforeEach } from 'vitest';
import type { PublicRun } from '@/lib/adventure/play/runToken';
import type { RunResult } from '../runTypes';
import { readCarry, runStorageKey, writeRun } from '../runStorage';
import { nextHintWord, potionsLeftOf, runWithTrophy, settleCompletedRun, NO_POTIONS } from '../runHelpers';

const run = { relics: ['magnet'], potions: { heal: 2 } } as unknown as PublicRun;

describe('runHelpers', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the next run token and its offer when the run moves on', () => {
    const data = { nextRunToken: 'next', nextRun: run, offer: [{ kind: 'relic' }] } as unknown as RunResult;
    expect(settleCompletedRun(1, data, 'live')).toBe('next');
    expect(JSON.parse(localStorage.getItem(runStorageKey(1)) ?? 'null')).toEqual({ runToken: 'next', run: { ...run, offer: data.offer } });
  });

  it('forgets a finished run and keeps the live token as the carry', () => {
    writeRun(1, { runToken: 'live', run });
    expect(settleCompletedRun(1, {} as RunResult, 'live')).toBe('');
    expect(localStorage.getItem(runStorageKey(1))).toBeNull();
    expect(readCarry()).toBe('live');
  });

  it('hints hunt targets before side words and skips found or given ones', () => {
    expect(nextHintWord(['cat'], ['dog'], [], [])).toBe('cat');
    expect(nextHintWord(['cat'], ['dog', 'owl'], ['cat'], ['dog'])).toBe('owl');
    expect(nextHintWord(undefined, ['dog'], ['dog'], [])).toBeNull();
  });

  it('counts potions left from the run minus those drunk', () => {
    expect(potionsLeftOf(run, { ...NO_POTIONS, heal: 1 })).toEqual({ ...NO_POTIONS, heal: 1 });
  });

  it('draws a minted trophy in the relic bar once', () => {
    expect(runWithTrophy(run, 'magnet' as never)).toBe(run);
    expect(runWithTrophy(run, 'lens' as never)?.relics).toEqual(['magnet', 'lens']);
    expect(runWithTrophy(null, 'lens' as never)).toBeNull();
  });
});
