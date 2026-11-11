import { describe, it, expect } from 'vitest';
import { RECORD_KEYS, recordKeyFor, getRecordDef, isRecordKey } from '../recordKeys';

describe('recordKeyFor', () => {
  it('maps every daily results hero mode to its own record', () => {
    expect(recordKeyFor('daily', 'word-hunt')).toBe('daily_word_hunt');
    expect(recordKeyFor('daily', 'word-wheel')).toBe('daily_word_wheel');
    expect(recordKeyFor('daily', 'connections')).toBe('daily_connections');
  });

  it('has no daily record without a known daily game', () => {
    expect(recordKeyFor('daily')).toBeNull();
    expect(recordKeyFor('daily', 'crossword')).toBeNull();
  });

  it('splits quick play and multiplayer by game, defaulting to classic', () => {
    expect(recordKeyFor('quickPlay', 'wheel-rush')).toBe('qp_wheel_rush');
    expect(recordKeyFor('quickPlay')).toBe('qp_classic');
    expect(recordKeyFor('multiplayer', 'word-hunt')).toBe('mp_word_hunt');
    expect(recordKeyFor('multiplayer', 'blast')).toBe('mp_blast');
    expect(recordKeyFor('multiplayer')).toBe('mp_classic');
  });

  it('gives blast, tower and single one record each', () => {
    expect(recordKeyFor('blast')).toBe('blast');
    expect(recordKeyFor('tower')).toBe('tower');
    expect(recordKeyFor('single')).toBe('single');
  });

  it('never gives classroom games a public record', () => {
    expect(recordKeyFor('edu')).toBeNull();
  });
});

describe('RECORD_KEYS', () => {
  it('lists each key once with its results mode and a label key', () => {
    const keys = RECORD_KEYS.map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const def of RECORD_KEYS) {
      expect(def.labelKey).toBe(`worldRecords.modes.${def.key}`);
    }
    expect(getRecordDef('tower')?.unit).toBe('metres');
    expect(getRecordDef('blast')?.mode).toBe('blast');
  });

  it('recognises only known keys', () => {
    expect(isRecordKey('qp_classic')).toBe(true);
    expect(isRecordKey('nope')).toBe(false);
    expect(isRecordKey(null)).toBe(false);
  });
});
