import { describe, it, expect } from 'vitest';
import { isTeacherProfile, teacherMenuEntry } from '../teacherRole';

describe('isTeacherProfile', () => {
  it('accepts the teacher role', () => {
    expect(isTeacherProfile({ user_role: 'teacher' })).toBe(true);
  });

  it('accepts admins, who need to reach the teacher tools too', () => {
    expect(isTeacherProfile({ user_role: 'admin' })).toBe(true);
    expect(isTeacherProfile({ is_admin: true })).toBe(true);
  });

  it('rejects students, nulls and a missing profile', () => {
    expect(isTeacherProfile({ user_role: 'student' })).toBe(false);
    expect(isTeacherProfile({ user_role: null })).toBe(false);
    expect(isTeacherProfile(null)).toBe(false);
    expect(isTeacherProfile(undefined)).toBe(false);
  });
});

describe('teacherMenuEntry', () => {
  it('sends an approved teacher to their dashboard', () => {
    // Until now the ONLY route back to /teacher was the approval email. Closing
    // the tab stranded them — there was no in-app navigation to the dashboard.
    expect(teacherMenuEntry({ user_role: 'teacher' })).toEqual({
      href: '/teacher',
      labelKey: 'education.nav.myClassroom',
      isTeacher: true,
    });
  });

  it('sends everyone else to the education landing, not a dead dashboard', () => {
    expect(teacherMenuEntry({ user_role: 'student' })).toEqual({
      href: '/education',
      labelKey: 'education.nav.forTeachers',
      isTeacher: false,
    });
  });

  it('shows the public entry to signed-out visitors', () => {
    expect(teacherMenuEntry(null).href).toBe('/education');
  });
});
