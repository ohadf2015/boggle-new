import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassroomWindowProgress } from '../ClassroomWindowProgress';
import { deriveWindowedClassroomProgress } from '@/lib/education/windowedClassroomProgress';

const refresh = vi.fn();
const mockUseProgress = vi.fn();
vi.mock('@/hooks/useClassroomWindowProgress', () => ({
  useClassroomWindowProgress: (...args: unknown[]) => mockUseProgress(...args),
}));
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({ hasPro: false, loading: false }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string, vars?: Record<string, string>) =>
      vars ? `${k}:${JSON.stringify(vars)}` : k,
  }),
}));

const NOW = Date.parse('2026-09-23T12:00:00.000Z');

function progress() {
  return deriveWindowedClassroomProgress({
    windowDays: 7,
    now: NOW,
    roster: [
      { studentId: 's1', name: 'Ada' },
      { studentId: 's2', name: 'Blaise' },
    ],
    sessions: [
      {
        studentId: 's1',
        completedAt: new Date(NOW - 86400000).toISOString(),
        foundCount: 8,
        missedCount: 2,
      },
    ],
  });
}

describe('ClassroomWindowProgress', () => {
  beforeEach(() => {
    mockUseProgress.mockReturnValue({
      progress: progress(),
      isLoading: false,
      error: null,
      refresh,
    });
  });

  it('shows 7d completion/accuracy and Polar upgrade CTA', () => {
    render(<ClassroomWindowProgress classroomId="c1" classroomName="Year 7" />);
    expect(screen.getByTestId('classroom-window-progress')).toBeTruthy();
    expect(screen.getByText('Ada')).toBeTruthy();
    const link = screen.getByTestId('window-progress-pro-link');
    expect(link.getAttribute('href')).toBe('/en/teacher/upgrade');
  });

  it('toggles the 30d window', async () => {
    const user = userEvent.setup();
    render(<ClassroomWindowProgress classroomId="c1" classroomName="Year 7" />);
    await user.click(screen.getByTestId('window-progress-30d'));
    expect(mockUseProgress).toHaveBeenCalledWith('c1', 30);
  });
});
