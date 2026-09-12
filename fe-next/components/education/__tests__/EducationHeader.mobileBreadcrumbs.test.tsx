import React from 'react';
import { render, screen } from '@testing-library/react';
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
  EducationBreadcrumbs: ({ className }: { className?: string }) => (
    <div data-testid="education-breadcrumbs" data-class={className ?? ''} />
  ),
}));
vi.mock('../EducationMenuDropdown', () => ({ EducationMenuDropdown: () => null }));

import { EducationHeader } from '../EducationHeader';

describe('EducationHeader breadcrumbs', () => {
  beforeEach(() => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'student', is_admin: false, display_name: 'Sam' },
    };
  });

  it('does not render the mobile breadcrumbs row', () => {
    render(<EducationHeader />);

    const crumbs = screen.getAllByTestId('education-breadcrumbs');
    expect(crumbs.some((el) => el.getAttribute('data-class') === 'text-xs')).toBe(false);
    expect(screen.queryByText('education.header.title')).toBeInTheDocument();
  });

  it('still renders desktop breadcrumbs', () => {
    render(<EducationHeader />);
    expect(screen.getAllByTestId('education-breadcrumbs').length).toBeGreaterThan(0);
  });
});
