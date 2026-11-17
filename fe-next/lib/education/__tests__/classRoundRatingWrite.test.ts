/**
 * A class-bubble rating becomes one row per (student, game_code).
 * Non-class surfaces and incomplete identity never write.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  planClassRoundRatingWrite,
  persistClassRoundRating,
  type ClassRoundRatingUpsert,
} from '../classRoundRatingWrite';

describe('planClassRoundRatingWrite', () => {
  const complete = {
    surface: 'class_round',
    studentId: 'student-1',
    classroomId: 'class-1',
    gameCode: 'ABC123',
    rating: 'great' as const,
  };

  it('builds one row keyed by student and game code', () => {
    expect(planClassRoundRatingWrite(complete)).toEqual({
      student_id: 'student-1',
      classroom_id: 'class-1',
      game_code: 'ABC123',
      rating: 'great',
    });
  });

  it('does not write a singleplayer rating', () => {
    expect(planClassRoundRatingWrite({ ...complete, surface: 'singleplayer' })).toBeNull();
  });

  it('does not invent a row when the student, class, or game is missing', () => {
    expect(planClassRoundRatingWrite({ ...complete, studentId: null })).toBeNull();
    expect(planClassRoundRatingWrite({ ...complete, classroomId: '' })).toBeNull();
    expect(planClassRoundRatingWrite({ ...complete, gameCode: undefined })).toBeNull();
  });

  it('rejects a rating outside bad|ok|great', () => {
    expect(planClassRoundRatingWrite({ ...complete, rating: 'love' })).toBeNull();
  });
});

describe('persistClassRoundRating', () => {
  it('upserts on (student_id, game_code) so a second tap replaces the row', async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const result = await persistClassRoundRating(
      {
        surface: 'class_round',
        studentId: 'student-1',
        classroomId: 'class-1',
        gameCode: 'ABC123',
        rating: 'ok',
      },
      { upsert },
    );
    expect(result).toBe('saved');
    expect(upsert).toHaveBeenCalledWith(
      {
        student_id: 'student-1',
        classroom_id: 'class-1',
        game_code: 'ABC123',
        rating: 'ok',
      } satisfies ClassRoundRatingUpsert,
      { onConflict: 'student_id,game_code' },
    );
  });

  it('skips the write when the plan is empty', async () => {
    const upsert = vi.fn();
    const result = await persistClassRoundRating(
      { surface: 'daily', studentId: 'student-1', classroomId: 'class-1', gameCode: 'ABC123', rating: 'ok' },
      { upsert },
    );
    expect(result).toBe('skipped');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('reports a failed upsert without throwing into the rating tap', async () => {
    const upsert = vi.fn(async () => ({ error: { message: 'rls' } }));
    const result = await persistClassRoundRating(
      {
        surface: 'class_round',
        studentId: 'student-1',
        classroomId: 'class-1',
        gameCode: 'ABC123',
        rating: 'bad',
      },
      { upsert },
    );
    expect(result).toBe('failed');
  });
});
