import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

type AuthState = { loading: boolean; isAuthenticated: boolean; user: Record<string, unknown> | null; profile: Record<string, unknown> | null };
let authState: AuthState;
let pathname = '/en/teacher';
const { pushMock, signOutMock } = vi.hoisted(() => ({ pushMock: vi.fn(), signOutMock: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, replace: vi.fn() }), usePathname: () => pathname }));
vi.mock('@/lib/supabase', () => ({ signOut: signOutMock }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/components/teacher/TeacherWhatsNew', () => ({ TeacherWhatsNew: () => null }));
vi.mock('@/components/teacher/TeacherHelpButton', () => ({ TeacherHelpButton: () => null }));
vi.mock('@/components/teacher/TeacherProNavLink', () => ({ TeacherProNavLink: () => null }));
vi.mock('../SearchIconButton', () => ({ SearchIconButton: () => null }));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { EducationHeader } from '../EducationHeader';

const LOADING: Record<string, AuthState> = {
  'auth still loading': { loading: true, isAuthenticated: false, user: null, profile: null },
  'signed in, profile not fetched yet': { loading: false, isAuthenticated: true, user: { id: 'u1', is_anonymous: false }, profile: null },
};

function allHrefs() {
  return Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));
}

describe.each(Object.entries(LOADING))('EducationHeader while the role is unknown (%s)', (_, state) => {
  it('the phone menu shows no link to the game home', () => {
    authState = state;
    pathname = '/en/teacher';
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.openMenu'));
    expect(screen.queryByText('education.header.exitEducation')).toBeNull();
    expect(allHrefs()).not.toContain('/en');
  });

  it('the desktop menu exit points at the education home, not the game home', () => {
    authState = state;
    pathname = '/en/teacher';
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.menu'));
    expect(screen.getByText('education.header.exitEducation').closest('a')).toHaveAttribute('href', '/en/education');
    expect(allHrefs()).not.toContain('/en');
  });
});

describe('EducationHeader on /student/join', () => {
  it('back goes to the class code entry, not the marketing landing', () => {
    authState = { loading: false, isAuthenticated: false, user: null, profile: null };
    pathname = '/en/student/join';
    pushMock.mockClear();
    render(<EducationHeader showBackButton />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(pushMock).toHaveBeenCalledWith('/en/join');
  });

  it('a signed-in student who signs out lands on the class code entry', async () => {
    authState = { loading: false, isAuthenticated: true, user: { id: 's1', is_anonymous: false }, profile: { user_role: 'student' } };
    pathname = '/en/student/join';
    pushMock.mockClear();
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.openMenu'));
    fireEvent.click(screen.getByText('auth.signOut'));
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith('/en/join'));
  });
});
