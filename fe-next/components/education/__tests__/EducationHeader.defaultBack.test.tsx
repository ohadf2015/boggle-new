import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockPush = vi.fn();
let mockPathname = '/en/education/classroom-game';
let mockProfile: Record<string, unknown> | null = null;

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: !!mockProfile, profile: mockProfile }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
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

function clickBack() {
  render(<EducationHeader showBackButton />);
  fireEvent.click(screen.getByLabelText('common.back'));
}

beforeEach(() => {
  mockPush.mockClear();
  mockProfile = null;
});

describe('EducationHeader — default back target', () => {
  it('a teacher on classroom-game goes to /teacher, not /education (which replace()s back to classroom-game)', () => {
    mockPathname = '/en/education/classroom-game';
    mockProfile = { user_role: 'teacher' };
    clickBack();
    expect(mockPush).toHaveBeenCalledWith('/en/teacher');
  });

  it.each(['/en/teacher/classroom', '/en/teacher/reports', '/en/teacher/curriculum', '/en/teacher/profile', '/en/teacher/upgrade'])(
    '%s goes back to Teacher HQ, not /education (which bounces a teacher to classroom-game)',
    (path) => {
      mockPathname = path;
      mockProfile = { user_role: 'teacher' };
      clickBack();
      expect(mockPush).toHaveBeenCalledWith('/en/teacher');
    },
  );

  it('student profile goes back to the student hub', () => {
    mockPathname = '/en/student/profile';
    clickBack();
    expect(mockPush).toHaveBeenCalledWith('/en/student');
  });

  it('a student lesson goes back to the student hub', () => {
    mockPathname = '/en/student/lessons/abc';
    mockProfile = { user_role: 'student' };
    clickBack();
    expect(mockPush).toHaveBeenCalledWith('/en/student');
  });

  it('classroom analytics goes back to Teacher HQ, not the nonexistent /teacher/classroom/[id]', () => {
    mockPathname = '/en/teacher/classroom/abc/analytics';
    mockProfile = { user_role: 'teacher' };
    clickBack();
    expect(mockPush).toHaveBeenCalledWith('/en/teacher');
  });
});
