import { describe, it, expect } from 'vitest';
import { teacherAssignHref, parseOpenAssignment } from '../useTeacherDashboardDeepLink';

describe('teacher dashboard "create assignment" deep link', () => {
  it('builds a dashboard URL that names the class and asks for the creator', () => {
    const href = teacherAssignHref('he', 'class 1');
    const url = new URL(href, 'https://x.test');
    expect(url.pathname).toBe('/he/teacher');
    expect(url.searchParams.get('classroomId')).toBe('class 1');
    expect(parseOpenAssignment(url.searchParams.get('assign'))).toBe(true);
  });

  it('only the exact flag opens the creator', () => {
    expect(parseOpenAssignment(null)).toBe(false);
    expect(parseOpenAssignment('0')).toBe(false);
    expect(parseOpenAssignment('1')).toBe(true);
  });
});
