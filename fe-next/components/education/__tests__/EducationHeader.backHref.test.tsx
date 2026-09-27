/**
 * EducationHeader's top-left back button defaults to `/{locale}/education`,
 * but on a classroom multiplayer game that is wrong — a teacher/student
 * mid-game should return to their OWN hub (teacher dashboard / student hub),
 * not the education marketing landing. `backHref` lets a caller (the
 * multiplayer PageClient) override the destination without EducationHeader
 * having to know about multiplayer/classroom concepts itself.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false, profile: null }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/multiplayer',
}));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({
  useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));
vi.mock('../EducationMenuDropdown', () => ({ EducationMenuDropdown: () => null }));

import { EducationHeader } from '../EducationHeader';

beforeEach(() => {
  mockPush.mockClear();
});

describe('EducationHeader — back button destination override', () => {
  it('defaults to /{locale}/education when no backHref is given', () => {
    render(<EducationHeader showBackButton />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(mockPush).toHaveBeenCalledWith('/en/education');
  });

  it('uses the given backHref instead of /{locale}/education when provided', () => {
    render(<EducationHeader showBackButton backHref="/en/teacher" />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(mockPush).toHaveBeenCalledWith('/en/teacher');
  });

  it('routes a classroom student back-button to the student hub via backHref', () => {
    render(<EducationHeader showBackButton backHref="/en/student" />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(mockPush).toHaveBeenCalledWith('/en/student');
  });
});
