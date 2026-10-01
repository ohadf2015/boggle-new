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

describe('EducationHeader — a live host confirms before leaving', () => {
  it('Given onBack, Then back calls it and does not navigate on its own', () => {
    const onBack = vi.fn();
    render(<EducationHeader showBackButton backHref="/en/teacher" onBack={onBack} />);
    fireEvent.click(screen.getByLabelText('common.back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });
});
