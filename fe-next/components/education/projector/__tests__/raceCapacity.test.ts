import { describe, expect, it } from 'vitest';
import { raceTilesToShow } from '../raceCapacity';
import type { LessonClaimSlot } from '@/shared/types/lessonClaims';

const slot = (index: number, claimed: boolean): LessonClaimSlot => ({ index, first: 'A', length: 4, claim: claimed ? { word: 'abcd', username: 'N', avatar: null, teamId: null } : null });
const board = (claimed: number[], n = 12) => Array.from({ length: n }, (_, i) => slot(i, claimed.includes(i)));

describe('raceTilesToShow — legible tiles only, never a squashed grid', () => {
  it('Given room for every tile, Then all show in order with nothing hidden', () => {
    const r = raceTilesToShow(board([1, 4]), 12);
    expect(r.shown.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(r.hidden).toBe(0);
  });

  it('Given less room than tiles, Then claimed tiles come first, one cell is kept for the "+N" tile, and N counts the rest', () => {
    const r = raceTilesToShow(board([7, 2, 9]), 6);
    expect(r.shown).toHaveLength(5);
    expect(r.shown.slice(0, 3).map((s) => s.index)).toEqual([2, 7, 9]);
    expect(r.hidden).toBe(7);
  });

  it('Given an unknown capacity (not measured yet), Then everything shows', () => {
    expect(raceTilesToShow(board([]), Infinity).hidden).toBe(0);
  });

  it('Given more claimed tiles than room, Then the newest room-worth of claimed tiles show and the rest count as hidden', () => {
    const r = raceTilesToShow(board([0, 1, 2, 3, 4, 5]), 4);
    expect(r.shown).toHaveLength(3);
    expect(r.hidden).toBe(9);
  });
});
