import { describe, it, expect } from 'vitest';
import { classroomModeLabelKey } from '../classroomModeLabels';

describe('classroomModeLabelKey with the quiz variant', () => {
  it('names a Boss Battle room by its own name, not the quiz it runs on', () => {
    expect(classroomModeLabelKey('vocab-quiz', 'boss')).toBe('eg2Modes.boss.name');
  });

  it('leaves every other room as it was', () => {
    expect(classroomModeLabelKey('vocab-quiz')).toBe('teacher.classroom.gameModes.vocabQuiz');
    expect(classroomModeLabelKey('vocab-quiz', null)).toBe('teacher.classroom.gameModes.vocabQuiz');
    expect(classroomModeLabelKey('blast', 'boss')).toBe('teacher.classroom.gameModes.blast');
  });
});

import { studentModeCopy } from '../ClassroomModeBannerStudent';

describe('student lobby strip for a Boss Battle room', () => {
  it('names the boss fight and says how to win it', () => {
    const copy = studentModeCopy('vocab-quiz', 'boss');
    expect(copy.nameKey).toBe('eg2Modes.boss.name');
    expect(copy.ruleKey).toBe('eg2Modes.boss.how');
  });

  it('keeps the plain quiz copy without the variant', () => {
    expect(studentModeCopy('vocab-quiz').nameKey).toBe('teacher.classroom.gameModes.vocabQuiz');
  });
});
