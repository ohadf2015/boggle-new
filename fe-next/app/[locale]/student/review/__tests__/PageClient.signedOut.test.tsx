import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/en/student/review',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('@/components/education/academyModes/useAuthedLessons', () => ({
  useAuthedLessons: () => ({ lessons: null, error: null, signedOut: true, retry: vi.fn() }),
}));
vi.mock('@/hooks/usePracticeSession', () => ({ usePracticeProgress: () => ({}) }));
vi.mock('@/components/education/PracticeSessionProvider', () => ({ PracticeSessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/academyModes/MissedWordsReview', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/education/academyModes/AcademyChrome', () => ({
  ACADEMY_ART: { lesson: '/x.png' },
  primaryButtonClass: '',
  secondaryButtonClass: '',
  AcademyModeFrame: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/education/academyModes/useRecordedXp', () => ({ useRecordedXp: () => ({}) }));
vi.mock('@/components/education/academyModes/useAcademyPlayer', () => ({ useAcademyPlayer: () => ({}) }));
vi.mock('@/lib/supabase/education/progress', () => ({ getStudentProgress: vi.fn() }));

import ReviewPageClient from '../PageClient';

describe('/student/review signed out', () => {
  it('offers the join step the copy asks for, not only a way back', () => {
    render(<ReviewPageClient />);
    const join = screen.getByRole('button', { name: 'eg2Fix.review.joinClass' });

    fireEvent.click(join);

    expect(mockPush).toHaveBeenCalledWith('/en/join');
  });
});
