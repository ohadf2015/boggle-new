import { describe, it, expect } from 'vitest';
import {
  summarizeTeacherProof,
  teacherProofToShow,
  TEACHER_PROOF_MIN_TEACHERS,
  TEACHER_PROOF_MIN_GAMES,
} from '../teacherProof';

describe('summarizeTeacherProof', () => {
  const owner = { c1: 't1', c2: 't1', c3: 't2', c4: 'qa' };

  it('counts distinct games and distinct teachers, one game per class+code', () => {
    const rows = [
      { classroom_id: 'c1', game_code: 'A' },
      { classroom_id: 'c1', game_code: 'A' }, // one row per student, same game
      { classroom_id: 'c2', game_code: 'A' }, // same code, other class = other game
      { classroom_id: 'c3', game_code: 'B' },
    ];
    expect(summarizeTeacherProof(rows, owner, new Set())).toEqual({ teachers: 2, games: 3 });
  });

  it('leaves QA / test-account teachers and orphaned classes out', () => {
    const rows = [
      { classroom_id: 'c4', game_code: 'Z' },
      { classroom_id: 'gone', game_code: 'Y' },
      { classroom_id: 'c3', game_code: 'B' },
    ];
    expect(summarizeTeacherProof(rows, owner, new Set(['qa']))).toEqual({ teachers: 1, games: 1 });
  });
});

describe('teacherProofToShow', () => {
  it('stays silent until BOTH numbers are big enough to be persuasive', () => {
    expect(teacherProofToShow({ teachers: 4, games: 9 })).toBeNull();
    expect(teacherProofToShow({ teachers: TEACHER_PROOF_MIN_TEACHERS, games: TEACHER_PROOF_MIN_GAMES - 1 })).toBeNull();
    expect(teacherProofToShow({ teachers: TEACHER_PROOF_MIN_TEACHERS - 1, games: 999 })).toBeNull();
  });

  it("shows today's real numbers (8 teachers, 16 games): small but true and specific", () => {
    expect(teacherProofToShow({ teachers: 8, games: 16 })).toEqual({ teachers: 8, games: 16 });
  });

  it('returns the real numbers once both clear the bar', () => {
    const s = { teachers: TEACHER_PROOF_MIN_TEACHERS, games: TEACHER_PROOF_MIN_GAMES };
    expect(teacherProofToShow(s)).toEqual(s);
  });
});
