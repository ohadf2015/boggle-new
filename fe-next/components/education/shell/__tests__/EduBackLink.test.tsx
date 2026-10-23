import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

let authState: { profile: Record<string, unknown> | null };
let pathname = '/he/student/achievements';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

import { EduBackLink, resolveEduBackHref } from '../EduBackLink';

describe('resolveEduBackHref', () => {
  const base = { locale: 'he', role: null } as const;

  it.each([
    ['/he/student/achievements', 'student', '/he/student'],
    ['/he/teacher/classroom/abc', 'teacher', '/he/teacher'],
    ['/he/education/duels', 'teacher', '/he/teacher'],
    ['/he/education/help', 'student', '/he/student'],
    ['/he/education/access', null, '/he/education'],
    ['/he/student/join', null, '/he/education'],
  ] as const)('%s as %s goes to %s', (path, role, expected) => {
    expect(resolveEduBackHref({ ...base, pathname: path, role })).toBe(expected);
  });

  it('keeps an explicit in-edu target', () => {
    expect(resolveEduBackHref({ ...base, pathname: '/he/teacher/reports', href: '/he/teacher/classroom/x' })).toBe('/he/teacher/classroom/x');
  });

  it.each(['/he', '/he/', '/', '/en', '/he/singleplayer', '/singleplayer', '/he/lexiclash-vs-kahoot', '/he/multiplayer', '/he/daily'])(
    'never returns the consumer target %s, even when asked to',
    (href) => {
      const out = resolveEduBackHref({ ...base, pathname: '/he/student/review', role: 'student', href });
      expect(out).toBe('/he/student');
    },
  );

  it('never resolves to a locale root for any role or path', () => {
    const paths = ['', '/he', '/he/education', '/he/teacher', '/he/student', '/he/join', '/he/education/live'];
    for (const role of ['teacher', 'student', null] as const) {
      for (const p of paths) {
        const out = resolveEduBackHref({ locale: 'he', role, pathname: p });
        expect(out).toMatch(/^\/he\/(teacher|student|education|join)/);
      }
    }
  });
});

describe('EduBackLink', () => {
  it('renders one locale-prefixed back link to the viewer hub', () => {
    authState = { profile: { user_role: 'student' } };
    pathname = '/he/student/achievements';
    render(<EduBackLink />);
    const link = screen.getByRole('link', { name: 'common.back' });
    expect(link).toHaveAttribute('href', '/he/student');
  });

  it('sends a teacher on a shared edu page to the teacher hub', () => {
    authState = { profile: { user_role: 'teacher' } };
    pathname = '/he/education/duels';
    render(<EduBackLink />);
    expect(screen.getByRole('link', { name: 'common.back' })).toHaveAttribute('href', '/he/teacher');
  });
});
