// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { endTeacherStudentMode, readTeacherStudentMode, startTeacherStudentMode } from '../teacherStudentMode';

afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe('teacher student mode flag', () => {
  it('Given a teacher opened the student view of a class, Then the flag names that class until they exit', () => {
    expect(readTeacherStudentMode()).toBeNull();
    startTeacherStudentMode('c1');
    expect(readTeacherStudentMode()).toEqual({ classroomId: 'c1' });
    endTeacherStudentMode();
    expect(readTeacherStudentMode()).toBeNull();
  });

  it('Given a garbled stored value, Then there is no flag', () => {
    sessionStorage.setItem('lexiclash:teacher-student-mode', '{"classroomId":7}');
    expect(readTeacherStudentMode()).toBeNull();
    sessionStorage.setItem('lexiclash:teacher-student-mode', 'not json');
    expect(readTeacherStudentMode()).toBeNull();
  });

  it('Given storage is blocked, Then nothing throws and there is no flag', () => {
    const blocked = () => { throw new Error('blocked'); };
    vi.stubGlobal('sessionStorage', { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(() => startTeacherStudentMode('c1')).not.toThrow();
    expect(readTeacherStudentMode()).toBeNull();
    expect(() => endTeacherStudentMode()).not.toThrow();
  });
});
