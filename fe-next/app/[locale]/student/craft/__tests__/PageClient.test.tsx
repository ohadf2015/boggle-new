import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let authUser: { id: string } | null = null;
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser, loading: false }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('lesson=L1'),
}));
const LESSON = { id: 'L1', name: 'Pets', language: 'en', words: [{ word: 'cat' }, { word: 'dog' }] };
vi.mock('@/hooks/usePracticeLessons', () => ({ usePracticeLesson: () => ({ lesson: LESSON, isLoading: false }) }));
vi.mock('@/components/education/academyModes/useAuthedLessons', () => ({
  useAuthedLessons: () => ({ lessons: null, signedOut: true, error: null }),
}));
vi.mock('@/hooks/usePracticeSession', () => ({ usePracticeProgress: () => ({ startSession: vi.fn() }) }));
vi.mock('@/components/education/PracticeSessionProvider', () => ({
  PracticeSessionProvider: ({ children, studentId }: { children: React.ReactNode; studentId: string }) => (
    <div data-testid="session" data-student={studentId}>{children}</div>
  ),
}));
vi.mock('@/components/education/academyModes/useRecordedXp', () => ({ useRecordedXp: () => vi.fn() }));
vi.mock('@/components/education/academyModes/useAcademyPlayer', () => ({ useAcademyPlayer: () => undefined }));
vi.mock('@/utils/guestManager', () => ({ getGuestSessionId: () => 'guest-device-1' }));
const workshopProps = vi.fn();
vi.mock('@/components/education/academyModes/WordWorkshop', () => ({
  default: (props: Record<string, unknown>) => {
    workshopProps(props);
    return <div data-testid="workshop" />;
  },
}));

import WordWorkshopPageClient from '../PageClient';

beforeEach(() => {
  workshopProps.mockReset();
  authUser = null;
});

describe('student craft page', () => {
  it('GIVEN a signed-in student (account or class guest) THEN missed words are queued under their account for this lesson', async () => {
    authUser = { id: 'stu-1' };
    render(<WordWorkshopPageClient />);
    await screen.findByTestId('workshop');
    expect(workshopProps.mock.calls.at(-1)![0]).toEqual(
      expect.objectContaining({ lessonWords: ['cat', 'dog'], review: { studentId: 'stu-1', lessonId: 'L1' } }),
    );
  });

  it('GIVEN a visitor with no account THEN the workshop still opens on the device id, with nothing queued for review', async () => {
    render(<WordWorkshopPageClient />);
    await screen.findByTestId('workshop');
    expect(screen.getByTestId('session').getAttribute('data-student')).toBe('guest-device-1');
    expect(workshopProps.mock.calls.at(-1)![0]).toEqual(expect.objectContaining({ review: undefined }));
  });
});
