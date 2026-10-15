import { describe, it, expect, beforeEach } from 'vitest';
import { useClassroomBossStore, liveMsLeft } from '../classroomBossStore';
import type { ClassroomBossView } from '@/shared/types/classroomBoss';

const view = (over: Partial<ClassroomBossView> = {}): ClassroomBossView => ({
  bossId: 'lexiconDragon', hp: 80, maxHp: 100, phase: 1, status: 'fighting', telegraph: null, nextAttackMs: 9000, staggers: 0,
  shield: 1, shieldMax: 5, combo: { count: 0, multiplier: 1, msLeft: 0 }, lastHits: [], topHitters: [], effect: null, pctDealt: 20,
  ...over,
});

describe('classroomBossStore', () => {
  beforeEach(() => useClassroomBossStore.getState().reset());

  it('given a state broadcast, then the view and its arrival time are kept', () => {
    useClassroomBossStore.getState().receiveState(view(), 5000);
    expect(useClassroomBossStore.getState().view?.hp).toBe(80);
    expect(useClassroomBossStore.getState().receivedAt).toBe(5000);
  });

  it('given a null broadcast (a round without a boss), then the boss is cleared', () => {
    useClassroomBossStore.getState().receiveState(view(), 1);
    useClassroomBossStore.getState().receiveState(null, 2);
    expect(useClassroomBossStore.getState().view).toBeNull();
  });

  it('given two hits on the same word, then each gets its own id so both pop', () => {
    const s = useClassroomBossStore.getState();
    s.receiveMyHit('cat', { dmg: 2, crit: false, multiplier: 1, totalDmg: 2 });
    const first = useClassroomBossStore.getState().myHit!.id;
    s.receiveMyHit('cat', { dmg: 2, crit: false, multiplier: 1, totalDmg: 4 });
    expect(useClassroomBossStore.getState().myHit!.id).toBe(first + 1);
    expect(useClassroomBossStore.getState().myHit!.totalDmg).toBe(4);
  });

  it('given a landed attack, then it is recorded with an id', () => {
    useClassroomBossStore.getState().receiveAttack({ kind: 'freeze', blocked: false, healed: 5, tiles: [] });
    expect(useClassroomBossStore.getState().attack).toMatchObject({ kind: 'freeze', id: 1 });
  });

  it('given the same room remounts (round -> results), then the final boss survives; a different room clears it', () => {
    const s = useClassroomBossStore.getState();
    s.attachRoom('ROOM1');
    s.receiveState(view({ status: 'escaped' }), 1);
    useClassroomBossStore.getState().attachRoom('ROOM1');
    expect(useClassroomBossStore.getState().view?.status).toBe('escaped');
    useClassroomBossStore.getState().attachRoom('ROOM2');
    expect(useClassroomBossStore.getState().view).toBeNull();
  });

  it('given a fresh boss arms for the next round, then last round\'s personal damage is cleared', () => {
    const s = useClassroomBossStore.getState();
    s.receiveMyHit('cat', { dmg: 2, crit: false, multiplier: 1, totalDmg: 40 });
    s.receiveState(view({ status: 'intro', hp: 100, lastHits: [] }), 1);
    expect(useClassroomBossStore.getState().myHit).toBeNull();
  });

  it('counts a relative countdown down from when it arrived, never below zero', () => {
    expect(liveMsLeft(6000, 1000, 3000)).toBe(4000);
    expect(liveMsLeft(6000, 1000, 99_000)).toBe(0);
  });
});
