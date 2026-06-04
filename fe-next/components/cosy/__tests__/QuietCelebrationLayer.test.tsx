import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QuietCelebrationLayer } from '../QuietCelebrationLayer';
import { QUIET_FEEDBACK_EVENT } from '@/lib/cosy/quietFeedback';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'cosy.wellDone' ? 'Well done' : key),
  }),
}));

function emit() {
  act(() => {
    window.dispatchEvent(new CustomEvent(QUIET_FEEDBACK_EVENT, { detail: {} }));
  });
}

describe('QuietCelebrationLayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('renders nothing until a quiet-celebrate event fires', () => {
    render(<QuietCelebrationLayer />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows a dignified, accessible acknowledgement when the event fires', () => {
    render(<QuietCelebrationLayer />);
    emit();
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent('Well done');
  });

  it('collapses a rapid burst of events into a single beat (throttle)', () => {
    render(<QuietCelebrationLayer />);
    emit();
    emit();
    emit();
    // A fireworks loop fires many times; calm shows ONE calm acknowledgement.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('varies the affirmation across separated beats (cozy warmth, not one flat line)', () => {
    render(<QuietCelebrationLayer />);
    emit();
    // First beat keeps the established calm cue.
    expect(screen.getByRole('status')).toHaveTextContent('Well done');
    // Clear the dwell + clear the throttle window, then celebrate again.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    emit();
    // Second beat rotates to the next warm phrase (mock echoes the raw key).
    expect(screen.getByRole('status')).toHaveTextContent('cosy.affirmLovely');
  });

  it('clears the acknowledgement after its dwell time (no lingering overlay)', () => {
    render(<QuietCelebrationLayer />);
    emit();
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
