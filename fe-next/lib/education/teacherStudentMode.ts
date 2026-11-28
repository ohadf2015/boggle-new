/** A teacher walking through the student app for one of their classes (per tab, until they exit). */

const KEY = 'lexiclash:teacher-student-mode';

export interface TeacherStudentMode {
  classroomId: string;
}

export function readTeacherStudentMode(): TeacherStudentMode | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as { classroomId?: unknown } | null;
    return typeof parsed?.classroomId === 'string' && parsed.classroomId ? { classroomId: parsed.classroomId } : null;
  } catch {
    return null;
  }
}

export function startTeacherStudentMode(classroomId: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ classroomId }));
  } catch {
    /* storage blocked: the student hub sends the teacher back to /teacher */
  }
}

export function endTeacherStudentMode(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: nothing was stored */
  }
}
