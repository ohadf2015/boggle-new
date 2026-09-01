import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnalyticsDashboardPreview from '../AnalyticsDashboardPreview';

/**
 * The free-tier preview shows "N students need help" but deliberately does NOT render the
 * per-student table — that is the paid half. The first cut still wired that metric's action to
 * `scrollIntoView` on a ref attached to an empty <div>, so a free teacher clicking
 * "view struggling students" was scrolled to nothing: the exact dead end the preview exists to
 * remove, reintroduced inside the fix for it.
 *
 * Knowing WHICH students need help is genuinely the paid answer, and the click is the moment of
 * peak interest, so the action must route to upgrade instead of nowhere.
 */

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const mockMetrics = {
  studentsNeedingHelp: 3,
  classAverageXp: 420,
  activeToday: 5,
  totalStudents: 25,
  commonMistakes: ['because', 'friend'],
};

vi.mock('@/hooks/useClassroomAnalytics', () => ({
  useClassroomAnalytics: () => ({
    metrics: mockMetrics,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

describe('AnalyticsDashboardPreview — the struggling-students action is not a dead end', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('does not leave a scroll target that points at nothing', () => {
    const { container } = render(<AnalyticsDashboardPreview classroomId="c1" />);

    // The paid student table must be absent for a free teacher...
    expect(screen.queryByTestId('student-progress-table')).not.toBeInTheDocument();

    // ...so there must be no empty placeholder pretending to be a scroll destination.
    // An element with no children, no text and no attributes other than ref is the tell.
    const emptyDivs = Array.from(container.querySelectorAll('div')).filter(
      (el) => el.children.length === 0 && !el.textContent?.trim() && el.attributes.length === 0
    );
    expect(emptyDivs).toHaveLength(0);
  });

  it('sends a free teacher to upgrade when they ask who needs help', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<AnalyticsDashboardPreview classroomId="c1" />);

    const action = screen.getByText('education.analytics.viewStudents');
    await user.click(action);

    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/teacher/upgrade'));
  });
});
