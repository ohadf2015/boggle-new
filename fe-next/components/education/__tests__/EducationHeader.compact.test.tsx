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

describe('EducationHeader compact: a quiet title for the Pick-a-game setup', () => {
  it('Given compact, Then the title is normal case, never cut, and the tagline is gone', () => {
    render(<EducationHeader compact showBackButton title="Classroom Game" />);
    const title = screen.getByTestId('edu-header-title');
    expect(title.className).not.toMatch(/uppercase|truncate/);
    expect(screen.getByText('education.header.subtitle').className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(screen.getByText('education.header.subtitle').className).not.toContain('sm:block');
  });

  it('Given the default header, Then its look is unchanged', () => {
    render(<EducationHeader showBackButton title="Classroom Game" />);
    expect(screen.getByTestId('edu-header-title').className).toMatch(/truncate.*uppercase/);
    expect(screen.getByText('education.header.subtitle').className).toContain('sm:block');
  });
});
