/**
 * The practice route's own recovery screen.
 *
 * A lesson link that falls over mid-flow was the single gap that disqualified
 * the previous round, so the failure state is held to the same bar as the happy
 * one: one dominant action, one smaller way out, and no dependency on a React
 * context that may be the very thing that threw.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/navigation', () => ({ useParams: () => ({ locale: 'he' }) }));
const captureError = vi.fn();
vi.mock('@/utils/sentry', () => ({ captureError: (...args: unknown[]) => captureError(...args) }));
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid="mascot" data-variant={variant} />,
}));
vi.mock('@/translations/loadTranslation', () => ({
  getCachedTranslation: () => ({
    student: { practiceFun: { tryAgain: 'נסו שוב', myLessons: 'השיעורים שלי' } },
    education: { practice: { lessonUnavailable: 'רגע', lessonUnavailableBody: 'לא הצלחנו' } },
  }),
}));

import LessonPracticeError from '../error';

describe('LessonPracticeError', () => {
  beforeEach(() => vi.clearAllMocks());

  it('offers exactly one dominant action, and it retries', () => {
    const reset = vi.fn();
    const { container } = render(<LessonPracticeError error={new Error('boom')} reset={reset} />);
    expect(container.querySelectorAll('[data-primary="true"]')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('practice-error-retry'));
    expect(reset).toHaveBeenCalled();
  });

  it('reads its copy from the cached bundle in the URL locale, not a context', () => {
    render(<LessonPracticeError error={new Error('boom')} reset={vi.fn()} />);
    expect(screen.getByTestId('practice-error-retry')).toHaveTextContent('נסו שוב');
    expect(screen.getByTestId('practice-error-exit')).toHaveTextContent('השיעורים שלי');
  });

  it('reports the failure so a broken lesson link is never silent', () => {
    render(<LessonPracticeError error={Object.assign(new Error('boom'), { digest: 'd1' })} reset={vi.fn()} />);
    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        errorBoundary: expect.objectContaining({ type: 'student-lesson-practice' }),
      })
    );
  });
});
