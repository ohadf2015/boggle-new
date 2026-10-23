import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, profile: null }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/en/education/help',
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

describe('EducationHeader paints its dropdown above the page below it', () => {
  it('stays a positioned z-[60] layer at every breakpoint', () => {
    const { container } = render(<EducationHeader />);
    const tokens = container.querySelector('header')!.className.split(/\s+/);
    expect(tokens).toContain('z-[60]');
    expect(tokens.filter((c) => /^([a-z0-9]+:)?static$/.test(c))).toEqual([]);
    expect(tokens).toContain('lg:relative');
  });
});
