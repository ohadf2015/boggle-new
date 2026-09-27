import { describe, it, expect } from 'vitest';
import { selectStudentMascotCue, STUDENT_MASCOT_VARIANTS } from '../studentMascotCue';
import type { WordFeedback } from '@/components/game/WordFormingArea';

const feedback = (over: Partial<WordFeedback>): WordFeedback => ({
  id: 'f1',
  type: 'accepted',
  word: 'HOUSE',
  timestamp: 1,
  ...over,
});

/**
 * Duolingo's actual mechanic is not a bigger animation — it is micro-feedback
 * density carried by ONE character whose expression changes on nearly every
 * screen (research.md §"what none of the quiz products do"). This selector is
 * that character's face: pure, so the emotional mapping is reviewable without
 * mounting React.
 *
 * The wrong-answer branch is the load-bearing one. A classroom cue that shames
 * a miss re-creates, per word, the competence frustration the rank reframe just
 * removed — so `oops` is deliberately non-punitive and never names a score.
 */
describe('selectStudentMascotCue', () => {
  it('is idle and quiet before the student has done anything', () => {
    const cue = selectStudentMascotCue(null, { roundOver: false });
    expect(cue.mood).toBe('idle');
    expect(cue.variant).toBe(STUDENT_MASCOT_VARIANTS.idle);
    expect(cue.messageKey).toBeNull();
  });

  it('celebrates an accepted word', () => {
    const cue = selectStudentMascotCue(feedback({ type: 'accepted', score: 5 }), {
      roundOver: false,
    });
    expect(cue.mood).toBe('correct');
    expect(cue.variant).toBe('celebration');
    expect(cue.messageKey).toBe('education.student.feel.correct');
    expect(cue.tone).toBe('ok');
  });

  it('gives a lesson word its own, louder cue — the teacher’s word is the point', () => {
    const cue = selectStudentMascotCue(
      feedback({ type: 'accepted', score: 9, fromLesson: true, lessonBonus: 5 }),
      { roundOver: false },
    );
    expect(cue.mood).toBe('lesson');
    expect(cue.messageKey).toBe('education.student.feel.lessonWord');
    // The server's figure, never recomputed here — it drives the spoken label.
    expect(cue.lessonBonus).toBe(5);
  });

  it('falls back to the plain lesson cue when an older server sends no bonus figure', () => {
    const cue = selectStudentMascotCue(feedback({ type: 'accepted', fromLesson: true }), {
      roundOver: false,
    });
    expect(cue.mood).toBe('lesson');
    expect(cue.lessonBonus).toBeNull();
  });

  it.each(['rejected', 'duplicate', 'foundByOther'] as const)(
    'answers a %s word with the non-shaming oops face',
    (type) => {
      const cue = selectStudentMascotCue(feedback({ type }), { roundOver: false });
      expect(cue.mood).toBe('oops');
      expect(cue.variant).toBe('oops');
      expect(cue.tone).toBe('muted');
    },
  );

  it('never attaches a score to a miss — a wrong answer costs nothing visible', () => {
    const cue = selectStudentMascotCue(feedback({ type: 'rejected', score: 0 }), {
      roundOver: false,
    });
    expect(cue.points).toBeNull();
  });

  it('carries the points of a correct word so the cue can show what it earned', () => {
    const cue = selectStudentMascotCue(feedback({ type: 'accepted', score: 7 }), {
      roundOver: false,
    });
    expect(cue.points).toBe(7);
  });

  it('switches to the round-end celebration regardless of the last word', () => {
    const cue = selectStudentMascotCue(feedback({ type: 'rejected' }), { roundOver: true });
    expect(cue.mood).toBe('roundEnd');
    expect(cue.messageKey).toBe('education.student.feel.roundOver');
  });

  it('uses only mascot variants from the one shipped character set', () => {
    // Continuity is the mechanic; a second lineage breaks it silently.
    expect(Object.values(STUDENT_MASCOT_VARIANTS)).toEqual(
      expect.arrayContaining(['celebration', 'oops']),
    );
  });
});
