/**
 * Two lessons called "Week 3 Vocabulary" must be tellable apart.
 *
 * `useLessons()` returns every lesson the TEACHER owns, across all her classes,
 * and reusing one vocabulary list across periods is the intended workflow. So
 * the assignment creator's dropdown can legitimately show the same name twice
 * with no way to pick the right one.
 *
 * Only AMBIGUOUS names get the classroom appended. Suffixing every row would
 * make the common case (one lesson, one name) noisier to read for a problem it
 * does not have — the same principle the student word-count label already
 * follows: disambiguate when it is ambiguous, and only then.
 */
import { describe, it, expect } from 'vitest';
import { labelLessonsForPicker } from '../lessonLabels';

const CLASSROOMS = { c1: 'ELA Period 3', c2: 'Flow Check' };

describe('labelLessonsForPicker', () => {
  it('leaves a unique name alone', () => {
    // GIVEN one lesson with a name nothing else shares
    const out = labelLessonsForPicker(
      [{ id: 'l1', name: 'Roots Week', classroom_id: 'c1' }],
      CLASSROOMS
    );

    // THEN no suffix — there is nothing to disambiguate
    expect(out).toEqual([{ id: 'l1', label: 'Roots Week' }]);
  });

  it('appends the classroom when two lessons share a name', () => {
    // GIVEN the same list assigned in two classes
    const out = labelLessonsForPicker(
      [
        { id: 'l1', name: 'Week 3 Vocabulary', classroom_id: 'c1' },
        { id: 'l2', name: 'Week 3 Vocabulary', classroom_id: 'c2' },
      ],
      CLASSROOMS
    );

    // THEN each row says which class it belongs to
    expect(out).toEqual([
      { id: 'l1', label: 'Week 3 Vocabulary — ELA Period 3' },
      { id: 'l2', label: 'Week 3 Vocabulary — Flow Check' },
    ]);
  });

  it('only suffixes the duplicated name, not the whole list', () => {
    // GIVEN a mix
    const out = labelLessonsForPicker(
      [
        { id: 'l1', name: 'Week 3 Vocabulary', classroom_id: 'c1' },
        { id: 'l2', name: 'Week 3 Vocabulary', classroom_id: 'c2' },
        { id: 'l3', name: 'Roots Week', classroom_id: 'c1' },
      ],
      CLASSROOMS
    );

    // THEN the unambiguous one stays clean
    expect(out[2]).toEqual({ id: 'l3', label: 'Roots Week' });
  });

  it('ignores case and padding when deciding what collides', () => {
    // GIVEN names a teacher would consider the same
    const out = labelLessonsForPicker(
      [
        { id: 'l1', name: 'Week 3 Vocabulary', classroom_id: 'c1' },
        { id: 'l2', name: '  week 3 vocabulary ', classroom_id: 'c2' },
      ],
      CLASSROOMS
    );

    // THEN both are disambiguated. A picker that calls these distinct is
    // technically right and practically useless.
    expect(out[0].label).toContain('ELA Period 3');
    expect(out[1].label).toContain('Flow Check');
  });

  it('falls back to the bare name when the classroom is unknown', () => {
    // GIVEN a teacher-wide lesson (classroom_id null — starter packs are made
    // this way) sharing a name with a classroom lesson
    const out = labelLessonsForPicker(
      [
        { id: 'l1', name: 'Week 3 Vocabulary', classroom_id: null },
        { id: 'l2', name: 'Week 3 Vocabulary', classroom_id: 'c2' },
      ],
      CLASSROOMS
    );

    // THEN we never render a dangling separator or the word "undefined"
    expect(out[0]).toEqual({ id: 'l1', label: 'Week 3 Vocabulary' });
    expect(out[1].label).toBe('Week 3 Vocabulary — Flow Check');
  });

  it('handles an empty list', () => {
    expect(labelLessonsForPicker([], CLASSROOMS)).toEqual([]);
  });
});
