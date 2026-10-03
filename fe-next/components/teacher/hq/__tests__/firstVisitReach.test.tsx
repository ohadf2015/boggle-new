/**
 * With the cookie sheet over the bottom ~180px of a 390x844 phone, the actions a teacher must reach
 * sit above it, and a closed sheet leaves no hit-targets behind the cards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as useClassroomHook from '@/hooks/useClassroom';

vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: vi.fn() }));
vi.mock('@/lib/education/telemetry', () => ({ trackTeacherOnboardingStep: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({ lessons: [], isLoading: false, error: null }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({ recentConfigs: [], hasRecentConfig: false }),
}));

import PlayTabFirstRunCard from '../../PlayTabFirstRunCard';
import { PlayNowLauncher } from '../../dashboard/PlayNowLauncher';

describe('first visit on a phone — reachable above the cookie sheet', () => {
  beforeEach(() => {
    vi.mocked(useClassroomHook.useClassrooms).mockReturnValue({
      createClassroom: vi.fn(),
    } as unknown as ReturnType<typeof useClassroomHook.useClassrooms>);
  });

  it('leads the no-class card with CREATE MY CLASS: nothing sits above it in the card body', () => {
    render(<PlayTabFirstRunCard />);
    const row = screen.getByTestId('first-run-create-class').closest('[data-first-run-cta-row]');
    expect(row).not.toBeNull();
    expect(row!.previousElementSibling).toBeNull();
  });

  it('keeps the closed change-words sheet out of layout so nothing behind the cards takes taps', () => {
    sessionStorage.clear();
    const { container } = render(<PlayNowLauncher onLaunch={vi.fn()} />);
    fireEvent.click(screen.getByTestId('play-now-change'));
    const sheet = container.querySelector('[data-hq-sheet="change-words"]')!;
    expect(sheet.className).toMatch(/(^|\s)hidden(\s|$)/);
    expect(sheet.className).toContain('group-open:flex');
  });
});
