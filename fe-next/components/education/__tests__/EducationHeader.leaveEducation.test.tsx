/**
 * Mobile menu "leave education" item — QA gap (c) from the 2026-09-18
 * edu-fun-dumped-on-homepage gauntlet.
 *
 * Requirements:
 *  1. The exit-education link must NOT sit directly adjacent to "Education
 *     Home" — it must be visually separated (its own section, below a
 *     divider), so a mis-tap doesn't accidentally leave education.
 *  2. It must be visually SECONDARY (thinner border, no drop-shadow /
 *     "shadow-hard" treatment) compared to the primary in-education nav
 *     links like "Education Home".
 *  3. It must render for BOTH authenticated and unauthenticated (guest
 *     student) users — guest students browse anonymously and still need a
 *     way out. A prior fix nested the exit link inside `{isAuthenticated &&
 *     ...}` alongside the "Sign Out" account section, which silently
 *     dropped the only escape hatch for anonymous guests.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let authState: { isAuthenticated: boolean; profile: Record<string, unknown> | null };

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/student',
}));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('../EducationBreadcrumbs', () => ({
  EducationBreadcrumbs: () => null,
}));
vi.mock('../EducationMenuDropdown', () => ({ EducationMenuDropdown: () => null }));

import { EducationHeader } from '../EducationHeader';

function openMobileMenu() {
  render(<EducationHeader />);
  fireEvent.click(screen.getByLabelText('common.openMenu'));
}

describe('EducationHeader mobile menu — exit-education placement & styling', () => {
  it('renders the exit-education link for an authenticated user, below a divider from Education Home', () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'student', is_admin: false, display_name: 'Sam' },
    };
    openMobileMenu();

    const eduHome = screen.getByText('education.header.educationHome').closest('a');
    const exitLink = screen.getByText('education.header.exitEducation').closest('a');
    expect(eduHome).toBeInTheDocument();
    expect(exitLink).toBeInTheDocument();

    // Not adjacent siblings — at least one element (a divider / section wrapper)
    // sits between the "Education Home" link and the "Exit Education" link.
    expect(eduHome!.nextElementSibling).not.toBe(exitLink);

    // The exit link is not the very next element after Education Home's
    // parent nav group either — there's a divider in between.
    const navGroup = eduHome!.parentElement; // the "Navigation Section" div
    expect(navGroup!.nextElementSibling).not.toContainElement(null);
    expect(navGroup!.nextElementSibling!.className).toMatch(/h-0\.5/); // divider
  });

  it('renders the exit-education link for an UNAUTHENTICATED (guest) user too', () => {
    // Guest students never sign in — the mobile menu's only "leave" path
    // must not be gated behind isAuthenticated.
    authState = { isAuthenticated: false, profile: null };
    openMobileMenu();

    expect(screen.getByText('education.header.exitEducation')).toBeInTheDocument();
  });

  it('styles exit-education as visually SECONDARY vs. the primary Education Home link', () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'student', is_admin: false, display_name: 'Sam' },
    };
    openMobileMenu();

    const eduHome = screen.getByText('education.header.educationHome').closest('a')!;
    const exitLink = screen.getByText('education.header.exitEducation').closest('a')!;

    // Primary nav link: bold 3px border + hard-shadow treatment.
    expect(eduHome.className).toMatch(/border-3/);
    expect(eduHome.className).toMatch(/shadow-hard/);

    // Exit link: thinner border, no shadow, transparent fill — secondary weight.
    expect(exitLink.className).toMatch(/border-2/);
    expect(exitLink.className).not.toMatch(/shadow-hard/);
    expect(exitLink.className).toMatch(/bg-transparent/);
  });

  it('exit-education link navigates to the main app root, not deeper into education', () => {
    authState = { isAuthenticated: false, profile: null };
    openMobileMenu();

    const exitLink = screen.getByText('education.header.exitEducation').closest('a');
    expect(exitLink).toHaveAttribute('href', '/en');
  });
});
