/**
 * At 390px the teacher's right-hand controls (What's new + Search + Help +
 * Music + hamburger) overflowed and clipped the hamburger off-screen on
 * /teacher. Search and What's new are desktop conveniences — on phones they
 * sit inside an sm+-only wrapper; Help stays visible everywhere.
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
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));
vi.mock('@/components/teacher/TeacherWhatsNew', () => ({ TeacherWhatsNew: () => <span data-testid="whats-new" /> }));
vi.mock('@/components/teacher/TeacherHelpButton', () => ({ TeacherHelpButton: () => <span data-testid="help" /> }));

import { EducationHeader } from '../EducationHeader';

const phoneHidden = (el: HTMLElement) => {
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const c = n.className?.toString() ?? '';
    if (/(^|\s)hidden(\s|$)/.test(c) && /(^|\s)sm:(flex|inline-flex|block)(\s|$)/.test(c)) return true;
  }
  return false;
};

describe('EducationHeader — fits a 390px phone for teachers', () => {
  it('hides Search and What’s new below sm', () => {
    render(<EducationHeader />);
    expect(phoneHidden(screen.getByLabelText('common.search'))).toBe(true);
    expect(phoneHidden(screen.getByTestId('whats-new'))).toBe(true);
  });

  it('keeps Help visible on phones', () => {
    render(<EducationHeader />);
    expect(phoneHidden(screen.getByTestId('help'))).toBe(false);
  });
});
