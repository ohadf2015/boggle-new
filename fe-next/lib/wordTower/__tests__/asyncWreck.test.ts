import { describe, it, expect } from 'vitest';
import { applyAsyncWrecks, type PendingWreck } from '../asyncWreck';
import { initWordTowerState, applyTowerWord } from '../wordTowerManager';
import { WRECK_COMPENSATION_SCRAMBLES } from '../sabotage';

// Build a small tower so there are floors to knock off.
function buildTower(floorCount: number) {
  let s = initWordTowerState({ gameCode: 'TEST', playerId: 'p1', language: 'en' });
  const words = ['cat', 'dog', 'sun', 'tree', 'star', 'moon', 'fish', 'bird'];
  for (let i = 0; i < floorCount; i++) {
    s = applyTowerWord(s, words[i % words.length]!, 1).state;
  }
  return s;
}

const wrecks = (...damages: number[]): PendingWreck[] =>
  damages.map((d, i) => ({ id: `w${i}`, attackerName: `Rival${i}`, damageFloors: d }));

describe('applyAsyncWrecks', () => {
  it('removes the summed floors from session state', () => {
    const tower = buildTower(6);
    const before = tower.floors.length;
    const r = applyAsyncWrecks(tower, wrecks(2, 1));
    expect(r.state.floors.length).toBe(before - 3);
    expect(r.totalFloorsRemoved).toBe(3);
  });

  it('never reduces below zero floors', () => {
    const tower = buildTower(2);
    const r = applyAsyncWrecks(tower, wrecks(5, 5));
    expect(r.state.floors.length).toBe(0);
    expect(r.state.heightM).toBeGreaterThanOrEqual(0);
  });

  it('never touches the protected personal-best high-water mark', () => {
    const tower = buildTower(6);
    const pbBefore = tower.heightHighWaterM;
    const r = applyAsyncWrecks(tower, wrecks(3));
    expect(r.state.heightHighWaterM).toBe(pbBefore);
  });

  it('reports the attacker names and the applied wreck ids (for idempotent marking)', () => {
    const tower = buildTower(6);
    const r = applyAsyncWrecks(tower, wrecks(1, 1));
    expect(r.attackerNames).toEqual(['Rival0', 'Rival1']);
    expect(r.appliedIds).toEqual(['w0', 'w1']);
  });

  it('grants compensation scrambles so the defender feels paid, not just hit', () => {
    const tower = buildTower(6);
    const before = tower.scramblesLeft;
    const r = applyAsyncWrecks(tower, wrecks(2));
    expect(r.state.scramblesLeft).toBe(before + WRECK_COMPENSATION_SCRAMBLES);
    expect(r.compensationScrambles).toBe(WRECK_COMPENSATION_SCRAMBLES);
  });

  it('is a no-op with no pending wrecks', () => {
    const tower = buildTower(4);
    const r = applyAsyncWrecks(tower, []);
    expect(r.state).toBe(tower);
    expect(r.totalFloorsRemoved).toBe(0);
    expect(r.appliedIds).toEqual([]);
  });
});
