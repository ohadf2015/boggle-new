import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let authState: { isAuthenticated: boolean; profile: Record<string, unknown> | null };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/en/education' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));

import { EducationHeader } from '../EducationHeader';

/**
 * The header's "Teacher dashboard" link was gated on `is_admin`, so an actual
 * teacher (user_role = 'teacher', not an admin) had no way back to their
 * dashboard from any education page. Gate on the shared teacher predicate.
 */
describe('EducationHeader teacher link', () => {
  function openMenu() {
    const buttons = screen.getAllByRole('button');
    // The first menu toggle is enough — both menus gate on the same flag.
    fireEvent.click(buttons[0]);
  }

  it('shows the teacher dashboard link to a teacher who is not an admin', () => {
    authState = { isAuthenticated: true, profile: { user_role: 'teacher', is_admin: false, display_name: 'Tori' } };
    render(<EducationHeader />);
    openMenu();
    expect(screen.getAllByRole('link').some((a) => a.getAttribute('href') === '/en/teacher')).toBe(true);
  });

  it('does not show it to a student', () => {
    authState = { isAuthenticated: true, profile: { user_role: 'student', is_admin: false, display_name: 'Sam' } };
    render(<EducationHeader />);
    openMenu();
    expect(screen.queryAllByRole('link').some((a) => a.getAttribute('href') === '/en/teacher')).toBe(false);
  });
});
