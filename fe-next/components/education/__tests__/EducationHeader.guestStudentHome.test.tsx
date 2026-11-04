import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let authState: Record<string, unknown>;
let language = 'en';
let pathname = '/en/education/live';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

import { EducationHeader } from '../EducationHeader';

const VIEWERS = {
  // The anonymous-auth trigger gives a guest a profile with no student role.
  guest: { isAuthenticated: true, user: { id: 'g1', is_anonymous: true }, profile: { display_name: 'Priya', user_role: null } },
  student: { isAuthenticated: true, user: { id: 's1' }, profile: { user_role: 'student' } },
  teacher: { isAuthenticated: true, user: { id: 't1' }, profile: { user_role: 'teacher' } },
  public: { isAuthenticated: false, user: null, profile: null },
} as const;

function linkHrefs(): (string | null)[] {
  return Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));
}

function openMenus(): void {
  fireEvent.click(screen.getByLabelText('common.openMenu'));
  const kebab = screen.getByLabelText('common.menu');
  fireEvent.click(kebab);
  expect(kebab).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0);
}

describe.each(['en', 'he'])('EducationHeader home for every viewer, language=%s', (lang) => {
  beforeEach(() => {
    language = lang;
    pathname = `/${lang}/education/live`;
  });

  it('a guest student who just played a class game goes back to the student hub, never the arcade', () => {
    authState = VIEWERS.guest;
    render(<EducationHeader />);
    openMenus();
    expect(linkHrefs()).not.toContain(`/${lang}`);
    for (const exit of screen.queryAllByText('education.header.exitEducation')) {
      expect(exit.closest('a')).toHaveAttribute('href', `/${lang}/student`);
    }
    expect(screen.getByLabelText('education.header.homeLink')).toHaveAttribute('href', `/${lang}/student`);
  });

  it.each(['student', 'teacher'] as const)('a signed-in %s never gets a link to the arcade home', (role) => {
    authState = VIEWERS[role];
    render(<EducationHeader />);
    openMenus();
    expect(linkHrefs()).not.toContain(`/${lang}`);
  });

  it('a signed-out public visitor keeps the separate Exit education item, but Home stays in edu', () => {
    authState = VIEWERS.public;
    render(<EducationHeader />);
    openMenus();
    const exits = screen.getAllByText('education.header.exitEducation');
    expect(exits.length).toBe(2);
    for (const exit of exits) expect(exit.closest('a')).toHaveAttribute('href', `/${lang}`);
    expect(screen.getByLabelText('education.header.homeLink')).toHaveAttribute('href', `/${lang}/education`);
  });
});
