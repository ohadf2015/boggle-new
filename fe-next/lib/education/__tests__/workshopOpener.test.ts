import { describe, it, expect } from 'vitest';
import { planWorkshopOpener, WORKSHOP_DIMS } from '../workshopOpener';

const word = (tiles: { row: number; col: number; letter: string }[]) =>
  [...tiles].sort((a, b) => a.col - b.col).map((t) => t.letter).join('');

describe('planWorkshopOpener', () => {
  it('GIVEN the academy dims THEN the board is the short 7x7 with a small bag', () => {
    expect(WORKSHOP_DIMS.size).toBe(7);
    expect(WORKSHOP_DIMS.bagSize).toBeLessThanOrEqual(40);
  });

  it('GIVEN two lesson targets WHEN planned THEN the Baron opens with the one NOT dealt to the student, across one row', () => {
    const plan = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    expect(plan).not.toBeNull();
    expect(word(plan.tiles)).toBe('TEACHER');
    expect(new Set(plan.tiles.map((t) => t.row)).size).toBe(1);
    expect(plan.tiles.every((t) => t.col >= 0 && t.col < 7 && t.row >= 0 && t.row < 7)).toBe(true);
  });

  it('GIVEN the plan THEN the dealt word can cross the opener vertically on the board (a guaranteed first move)', () => {
    const plan = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    const { cross } = plan;
    expect(cross).not.toBeNull();
    const { col, startRow } = cross!;
    const letters = [...'PUZZLE'];
    expect(startRow).toBeGreaterThanOrEqual(0);
    expect(startRow + letters.length).toBeLessThanOrEqual(7);
    const at = plan.tiles.find((t) => t.col === col)!;
    expect(letters[at.row - startRow]).toBe(at.letter);
  });

  it('GIVEN opener tiles THEN they carry real tile values and ids that can never collide with bag ids', () => {
    const plan = planWorkshopOpener(['PUZZLE', 'TEACHER'], 7, 'en')!;
    expect(plan.tiles.find((t) => t.letter === 'H')!.value).toBeGreaterThan(1);
    const ids = plan.tiles.map((t) => t.rackTileId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('opener-'))).toBe(true);
    expect(plan.tiles.every((t) => !t.isBlank)).toBe(true);
  });

  it('GIVEN a single lesson target THEN the opener is that word (the board still starts with letters)', () => {
    const plan = planWorkshopOpener(['CAT'], 7, 'en')!;
    expect(word(plan.tiles)).toBe('CAT');
    expect(plan.cross).not.toBeNull();
  });

  it('GIVEN no targets or none that fit THEN no opener', () => {
    expect(planWorkshopOpener([], 7, 'en')).toBeNull();
    expect(planWorkshopOpener(['ABCDEFGHIJ'], 7, 'en')).toBeNull();
  });

  it('GIVEN an opener with no shared letter THEN it is still centred on the board', () => {
    const plan = planWorkshopOpener(['DOG', 'CAT'], 7, 'en')!;
    expect(word(plan.tiles)).toBe('CAT');
    expect(plan.cross).toBeNull();
    expect(plan.tiles[0].row).toBe(3);
    expect(Math.min(...plan.tiles.map((t) => t.col))).toBe(2);
  });
});
