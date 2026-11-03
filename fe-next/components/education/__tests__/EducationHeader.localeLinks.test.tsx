import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let authState: { isAuthenticated: boolean; profile: Record<string, unknown> | null };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'he' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/he/education/duels' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));
vi.mock('@/components/teacher/TeacherWhatsNew', () => ({ TeacherWhatsNew: () => null }));
vi.mock('@/components/teacher/TeacherHelpButton', () => ({ TeacherHelpButton: () => null }));
vi.mock('@/components/teacher/TeacherProNavLink', () => ({ TeacherProNavLink: () => null }));
vi.mock('../SearchIconButton', () => ({ SearchIconButton: () => null }));

import { EducationHeader } from '../EducationHeader';

const TEACHER = { isAuthenticated: true, profile: { user_role: 'teacher', display_name: 'Tal' } };
const STUDENT = { isAuthenticated: true, profile: { user_role: 'student', display_name: 'Noa' } };
const GUEST = { isAuthenticated: false, profile: null };

const anchors = (root: ParentNode = document) => Array.from(root.querySelectorAll('a[href]'));
const hrefs = () => anchors().map((a) => a.getAttribute('href') ?? '');

describe('EducationHeader links under he', () => {
  it.each([
    ['teacher', TEACHER],
    ['student', STUDENT],
    ['guest', GUEST],
  ] as const)('every %s link keeps the /he prefix and stays in edu with menus closed', (_, auth) => {
    authState = auth;
    render(<EducationHeader showBackButton />);
    const all = hrefs();
    expect(all.length).toBeGreaterThan(0);
    for (const h of all) expect(h).toMatch(/^\/he\/(education|teacher|student|join)/);
  });

  it.each([
    ['teacher', TEACHER, '/he/teacher'],
    ['student', STUDENT, '/he/student'],
    ['guest', GUEST, '/he/education'],
  ] as const)('the logo sends a %s to their own edu hub', (_, auth, hub) => {
    authState = auth;
    render(<EducationHeader />);
    expect(screen.getByRole('link', { name: 'education.header.homeLink' })).toHaveAttribute('href', hub);
  });

  it.each([
    ['teacher', TEACHER],
    ['student', STUDENT],
  ] as const)('neither menu sends a signed-in %s to the game home', (_, auth) => {
    authState = auth;
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.menu'));
    fireEvent.click(screen.getByLabelText('common.openMenu'));
    const all = hrefs();
    expect(all.length).toBeGreaterThan(0);
    for (const h of all) expect(h).toMatch(/^\/he\/(education|teacher|student|join)/);
  });

  it('a signed-out visitor keeps exactly one way out in each menu', () => {
    authState = GUEST;
    render(<EducationHeader />);
    fireEvent.click(screen.getByLabelText('common.menu'));
    const menuExits = anchors(screen.getByRole('menu')).filter((a) => a.getAttribute('href') === '/he');
    expect(menuExits).toHaveLength(1);
    expect(menuExits[0]).toHaveTextContent('education.header.exitEducation');
    fireEvent.click(screen.getByLabelText('common.openMenu'));
    const exits = anchors().filter((a) => a.getAttribute('href') === '/he');
    expect(exits).toHaveLength(2);
    for (const a of exits) expect(a).toHaveTextContent('education.header.exitEducation');
  });
});
