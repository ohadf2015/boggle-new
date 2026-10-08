/**
 * Renders the real header and desktop menu and reads the exit links they emit.
 * The route matrix pins helper outputs; this pins what the DOM actually links to.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Profile = Record<string, unknown> | null;
let authState: { isAuthenticated: boolean; profile: Profile };
let language = 'en';
let pathname = '/en/education';
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => pathname,
}));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/components/teacher/TeacherWhatsNew', () => ({ TeacherWhatsNew: () => null }));
vi.mock('@/components/teacher/TeacherHelpButton', () => ({ TeacherHelpButton: () => null }));
vi.mock('@/components/teacher/TeacherProNavLink', () => ({ TeacherProNavLink: () => null }));
vi.mock('../SearchIconButton', () => ({ SearchIconButton: () => null }));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import { EducationHeader } from '../EducationHeader';

const ROLES = {
  teacher: { isAuthenticated: true, profile: { user_role: 'teacher', is_admin: false } },
  student: { isAuthenticated: true, profile: { user_role: 'student', is_admin: false } },
  guest: { isAuthenticated: false, profile: null },
} as const;

type Role = keyof typeof ROLES;
// "Exit Education" is the deliberate way out, so it always leaves for the app home.
const exitHref = (lang: string) => `/${lang}`;

describe.each(['en', 'he', 'sv', 'ja', 'es', 'ru'])('EducationHeader exit links, language=%s', (lang) => {
  beforeEach(() => {
    language = lang;
    pathname = `/${lang}/education`;
  });

  it.each(Object.keys(ROLES) as Role[])('mobile "Exit Education" for %s', (role) => {
    authState = ROLES[role];
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.openMenu'));

    const exit = screen.getByText('education.header.exitEducation').closest('a');
    expect(exit).toHaveAttribute('href', exitHref(lang));
  });

  it('logo always links to the education landing, never the marketing home', () => {
    authState = ROLES.teacher;
    const { container } = render(<EducationHeader />);
    const logo = container.querySelector(`a[href="/${lang}/education"]`);
    expect(logo).not.toBeNull();
  });

  it.each(['teacher', 'student'] as Role[])('desktop menu "Exit Education" for %s', (role) => {
    authState = ROLES[role];
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.menu'));

    const menu = screen.getByText('education.header.exitEducation').closest('a');
    expect(menu).toHaveAttribute('href', exitHref(lang));
  });

  it('desktop menu has no exit item for a guest', () => {
    authState = ROLES.guest;
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.menu'));
    expect(screen.queryByText('education.header.exitEducation')).toBeNull();
  });
});

describe('EducationHeader back button', () => {
  beforeEach(() => {
    language = 'en';
    pushMock.mockClear();
  });

  it('teacher on classroom-game backs to the teacher hub, not the landing that bounces them back', () => {
    authState = ROLES.teacher;
    pathname = '/en/education/classroom-game';
    render(<EducationHeader showBackButton />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(pushMock).toHaveBeenCalledWith('/en/teacher');
  });

  it('student on a subpage backs to the student hub', () => {
    authState = ROLES.student;
    pathname = '/en/student/achievements';
    render(<EducationHeader showBackButton />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(pushMock).toHaveBeenCalledWith('/en/student');
  });

  it('an explicit backHref (classroom lobby) overrides the default back target', () => {
    authState = ROLES.teacher;
    pathname = '/en/education/classroom-game';
    render(<EducationHeader showBackButton backHref="/en/teacher" />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(pushMock).toHaveBeenCalledWith('/en/teacher');
  });
});
