import { describe, it, expect, beforeEach } from 'vitest';
import { collectPersonalRecords } from '../personalRecords';
import { evaluateAgainstLedger, publishRunRecord, __resetRunRecordsForTests } from '../runRecord';

describe('collectPersonalRecords — one read over the scattered bests', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetRunRecordsForTests();
  });

  it('reads profile, device and ledger sources into one list', () => {
    // Given bests spread across the profile row and this device
    localStorage.setItem('blast:best:v1:easy', '120');
    localStorage.setItem('blast:best:v1:hard', '300');
    localStorage.setItem('wordTowerV2.bestM', '42.5');
    localStorage.setItem('lexiclash_quick_guest_v1', JSON.stringify({ bestScoreByMode: { classic: 55, blitz: 70 }, history: [] }));
    evaluateAgainstLedger('multiplayer', 200);
    const records = collectPersonalRecords({
      longest_word: 'quixotic',
      mp_best_streak_classic: 3,
      mp_best_streak_wordhunt: 5,
    });
    const byKey = Object.fromEntries(records.map(r => [r.key, r]));
    // Then each record carries its best value
    expect(byKey.longestWord.value).toBe('quixotic');
    expect(byKey.blastBest.value).toBe(300);
    expect(byKey.towerBestM.value).toBe(42.5);
    expect(byKey.quickPlayBest.value).toBe(70);
    expect(byKey.mpBestStreak.value).toBe(5);
    expect(byKey.multiplayerBest.value).toBe(200);
  });

  it('carries the beaten value from the record ledger', () => {
    localStorage.setItem('blast:best:v1:hard', '300');
    publishRunRecord({ mode: 'blast', value: 300, previous: 250 });
    const blast = collectPersonalRecords({}).find(r => r.key === 'blastBest');
    expect(blast?.previous).toBe(250);
  });

  it('omits records the player has never set', () => {
    expect(collectPersonalRecords({})).toEqual([]);
  });
});

describe('device keys stay in sync with the writers', () => {
  it('tower best written by the run is read back', async () => {
    const { writeBest } = await import('@/components/wordTowerV2/runHelpers');
    localStorage.clear();
    writeBest(17.25);
    expect(collectPersonalRecords({}).find(r => r.key === 'towerBestM')?.value).toBe(17.25);
  });
});
