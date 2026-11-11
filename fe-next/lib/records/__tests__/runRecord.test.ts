import { describe, it, expect, beforeEach } from 'vitest';
import {
  publishRunRecord,
  getRunRecord,
  evaluateAgainstLedger,
  readRecordLedger,
  __resetRunRecordsForTests,
} from '../runRecord';

describe('runRecord — the record a run just set', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetRunRecordsForTests();
  });

  it('a published record beats its previous best', () => {
    // Given a mode that knows its pre-run best
    publishRunRecord({ mode: 'quickPlay', value: 80, previous: 64 });
    // Then the record is readable with the beaten value
    expect(getRunRecord('quickPlay')).toEqual({ mode: 'quickPlay', value: 80, previous: 64 });
  });

  it('a run that does not beat the previous best is not a record', () => {
    publishRunRecord({ mode: 'blast', value: 50, previous: 90 });
    expect(getRunRecord('blast')).toBeNull();
  });

  it('a first-ever run is not a record (nothing beaten)', () => {
    publishRunRecord({ mode: 'blast', value: 50, previous: null });
    expect(getRunRecord('blast')).toBeNull();
  });

  it('ledger fallback: first score seeds the ledger without a banner', () => {
    // Given a mode with no stored best (multiplayer)
    expect(evaluateAgainstLedger('multiplayer', 120)).toBeNull();
    expect(readRecordLedger().multiplayer?.best).toBe(120);
  });

  it('ledger fallback: a higher score later is a record with the previous best', () => {
    evaluateAgainstLedger('multiplayer', 120);
    expect(evaluateAgainstLedger('multiplayer', 150)).toEqual({ mode: 'multiplayer', value: 150, previous: 120 });
    expect(readRecordLedger().multiplayer).toEqual({ best: 150, previous: 120 });
  });

  it('ledger fallback: re-evaluating the same run keeps the same answer (remount)', () => {
    evaluateAgainstLedger('multiplayer', 120);
    const first = evaluateAgainstLedger('multiplayer', 150);
    const again = evaluateAgainstLedger('multiplayer', 150);
    expect(again).toEqual(first);
  });

  it('survives storage that throws', () => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('blocked'); };
    try {
      expect(evaluateAgainstLedger('daily', 10)).toBeNull();
    } finally {
      Storage.prototype.getItem = orig;
    }
  });
});
