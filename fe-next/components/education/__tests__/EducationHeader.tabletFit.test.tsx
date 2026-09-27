/**
 * At 1024x768 (tablet landscape) the 240px education sidebar is already on
 * screen and names the page, yet the header still showed the breadcrumb
 * trail. Its min-content pushed the shrink-0 controls row ~13px past the
 * viewport, clipping the menu button. Crumbs now wait for xl, and their slot
 * may shrink (min-w-0) before the controls ever do.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, profile: { user_role: 'teacher', is_admin: false, display_name: 'Tori' } }),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/en/teacher' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => <nav data-testid="crumbs" /> }));
vi.mock('@/components/teacher/TeacherWhatsNew', () => ({ TeacherWhatsNew: () => <span data-testid="whats-new" /> }));
vi.mock('@/components/teacher/TeacherHelpButton', () => ({ TeacherHelpButton: () => <span data-testid="help" /> }));

import { EducationHeader } from '../EducationHeader';

const cls = (el: HTMLElement | null) => el?.className?.toString() ?? '';

describe('EducationHeader — fits a 1024px tablet beside the sidebar', () => {
  it('Given a tablet landscape, Then the breadcrumbs only appear from xl', () => {
    render(<EducationHeader />);
    const slot = screen.getByTestId('crumbs').parentElement;
    expect(cls(slot)).toMatch(/(^|\s)hidden(\s|$)/);
    expect(cls(slot)).toMatch(/(^|\s)xl:flex(\s|$)/);
    expect(cls(slot)).not.toMatch(/(^|\s)lg:flex(\s|$)/);
  });

  it('Given a long trail, Then its slot can shrink below its content (min-w-0)', () => {
    render(<EducationHeader />);
    expect(cls(screen.getByTestId('crumbs').parentElement)).toMatch(/(^|\s)min-w-0(\s|$)/);
  });
});
