/**
 * Teacher activation — the two steps after approval that turn a classroom
 * into a paying Teacher Pro classroom.
 *
 * Dogfooding 2026-09-13: students joining is easy; creating the first
 * assignment is the step teachers stall on. This module decides which of
 * those two the dashboard may show, and nothing else:
 *   - empty roster + a join code → share the student-join link
 *   - students on the roster + zero assignments → create first assignment
 *
 * `assignmentCount: null` means "we do not know" (still loading, or the
 * read failed). Publishing "zero assignments" from that is the silent-
 * failure shape this repo keeps paying for — a blip would nag a teacher
 * who already assigned work.
 */
import { describe, it, expect } from 'vitest';
import { teacherActivationStep } from '../teacherActivation';

describe('teacherActivationStep', () => {
  describe('given a classroom with nobody on the roster', () => {
    it('asks the teacher to share the join link when a code exists', () => {
      expect(
        teacherActivationStep({ rosterCount: 0, assignmentCount: 0, joinCode: 'Q3UQ2J' }),
      ).toBe('shareJoin');
    });

    it('stays quiet when there is no code to share', () => {
      expect(
        teacherActivationStep({ rosterCount: 0, assignmentCount: null, joinCode: '' }),
      ).toBeNull();
      expect(
        teacherActivationStep({ rosterCount: 0, assignmentCount: null, joinCode: null }),
      ).toBeNull();
    });

    it('still shares even if assignments already exist — nobody can do them yet', () => {
      expect(
        teacherActivationStep({ rosterCount: 0, assignmentCount: 2, joinCode: 'ABC123' }),
      ).toBe('shareJoin');
    });
  });

  describe('given students on the roster and zero assignments', () => {
    it('asks the teacher to create the first assignment', () => {
      expect(
        teacherActivationStep({ rosterCount: 3, assignmentCount: 0, joinCode: 'Q3UQ2J' }),
      ).toBe('firstAssignment');
    });
  });

  describe('given students and at least one assignment', () => {
    it('does not nag — activation already happened', () => {
      expect(
        teacherActivationStep({ rosterCount: 3, assignmentCount: 1, joinCode: 'Q3UQ2J' }),
      ).toBeNull();
    });
  });

  describe('given students but an unknown assignment count', () => {
    it('does not pretend the class has zero assignments', () => {
      expect(
        teacherActivationStep({ rosterCount: 3, assignmentCount: null, joinCode: 'Q3UQ2J' }),
      ).toBeNull();
    });
  });
});
