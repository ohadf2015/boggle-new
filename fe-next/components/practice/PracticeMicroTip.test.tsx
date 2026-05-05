import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PracticeMicroTip from './PracticeMicroTip';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

describe('PracticeMicroTip', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the localized string for the current beat', () => {
    render(<PracticeMicroTip beat="drag" onDismiss={() => {}} />);
    expect(screen.getByTestId('practice-micro-tip')).toHaveTextContent('practice.tutorial.drag');
  });

  it('renders nothing when beat is null', () => {
    render(<PracticeMicroTip beat={null} onDismiss={() => {}} />);
    expect(screen.queryByTestId('practice-micro-tip')).toBeNull();
  });

  it('auto-dismisses after 1600ms (drag beat)', () => {
    const onDismiss = vi.fn();
    render(<PracticeMicroTip beat="drag" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses extended duration for goalComplete (3500ms)', () => {
    const onDismiss = vi.fn();
    render(<PracticeMicroTip beat="goalComplete" onDismiss={onDismiss} />);
    act(() => { vi.advanceTimersByTime(1700); });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
