import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BlastWordFeedback } from '../BlastWordFeedback';

const t = (_key: string, fallback?: string) => fallback ?? _key;

describe('BlastWordFeedback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows the "checking" pill while a dictionary check is pending', () => {
    render(
      <BlastWordFeedback
        dictCheckPending
        lastValidation={null}
        eventKey={0}
        modeColor="#00FFFF"
        t={t}
      />,
    );
    expect(screen.getByTestId('blast-feedback-checking')).toBeInTheDocument();
    expect(screen.queryByTestId('blast-feedback-bonus')).not.toBeInTheDocument();
  });

  it('celebrates a freshly found bonus word with the word text', () => {
    render(
      <BlastWordFeedback
        dictCheckPending={false}
        lastValidation={{ kind: 'bonus', word: 'quartz' }}
        eventKey={1}
        modeColor="#00FFFF"
        t={t}
      />,
    );
    const pill = screen.getByTestId('blast-feedback-bonus');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent?.toLowerCase()).toContain('quartz');
  });

  it('celebrates a theme-word match with a distinct "TARGET" toast carrying the word', () => {
    render(
      <BlastWordFeedback
        dictCheckPending={false}
        lastValidation={{ kind: 'theme_match', word: 'CAT' }}
        eventKey={1}
        modeColor="#00FFFF"
        t={t}
      />,
    );
    const pill = screen.getByTestId('blast-feedback-target');
    expect(pill).toBeInTheDocument();
    expect(pill.textContent?.toUpperCase()).toContain('CAT');
    // The target toast is its own thing — not the bonus pill.
    expect(screen.queryByTestId('blast-feedback-bonus')).not.toBeInTheDocument();
    expect(screen.queryByTestId('blast-feedback-checking')).not.toBeInTheDocument();
  });

  it('auto-hides the target toast after visibleMs', () => {
    render(
      <BlastWordFeedback
        dictCheckPending={false}
        lastValidation={{ kind: 'theme_match', word: 'CAT' }}
        eventKey={1}
        modeColor="#00FFFF"
        visibleMs={1200}
        t={t}
      />,
    );
    expect(screen.getByTestId('blast-feedback-target')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1300);
    });
    expect(screen.queryByTestId('blast-feedback-target')).not.toBeInTheDocument();
  });

  it('renders nothing when idle', () => {
    const { container } = render(
      <BlastWordFeedback
        dictCheckPending={false}
        lastValidation={null}
        eventKey={0}
        modeColor="#00FFFF"
        t={t}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('auto-hides the bonus pill after visibleMs', () => {
    render(
      <BlastWordFeedback
        dictCheckPending={false}
        lastValidation={{ kind: 'bonus', word: 'quartz' }}
        eventKey={1}
        modeColor="#00FFFF"
        visibleMs={1500}
        t={t}
      />,
    );
    expect(screen.getByTestId('blast-feedback-bonus')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.queryByTestId('blast-feedback-bonus')).not.toBeInTheDocument();
  });
});
