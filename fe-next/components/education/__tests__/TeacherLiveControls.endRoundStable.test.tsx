import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TeacherLiveControls } from '../TeacherLiveControls';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k, dir: 'ltr' }),
}));

function renderControls(onEndRound = vi.fn()) {
  render(
    <TeacherLiveControls
      isPaused={false}
      gameMode="classic"
      onPause={vi.fn()}
      onResume={vi.fn()}
      onExtendTime={vi.fn()}
      onEndRound={onEndRound}
      onSkipWord={vi.fn()}
      students={[]}
      hostUsername="teacher"
      socket={null}
    />
  );
  return onEndRound;
}

describe('TeacherLiveControls — armed END ROUND holds still', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // The app-wide `@keyframes pulse` scales to 0.9, so `animate-pulse` made the
  // confirm tap chase a shrinking button until the window closed.
  it('drops the geometry-changing pulse once armed', () => {
    renderControls();
    const btn = screen.getByTestId('teacher-end-round');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('data-armed', 'true');
    expect(btn.className).not.toMatch(/\banimate-pulse\b/);
    expect(btn.querySelector('[class*="animate-pulse"]')).toBeNull();
  });

  it('shows the confirm window draining inside the button', () => {
    renderControls();
    const btn = screen.getByTestId('teacher-end-round');
    expect(screen.queryByTestId('teacher-end-round-drain')).toBeNull();
    fireEvent.click(btn);
    const drain = screen.getByTestId('teacher-end-round-drain');
    expect(btn.contains(drain)).toBe(true);
    expect(drain).toHaveAttribute('aria-hidden', 'true');
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByTestId('teacher-end-round-drain')).toBeNull();
  });

  it('the second tap inside the window ends the round', () => {
    const onEndRound = renderControls();
    const btn = screen.getByTestId('teacher-end-round');
    fireEvent.click(btn);
    act(() => { vi.advanceTimersByTime(3500); });
    fireEvent.click(btn);
    expect(onEndRound).toHaveBeenCalledTimes(1);
  });
});

describe('TeacherLiveControls — the longest label gets the most room', () => {
  // "SKIP QUESTION" clipped to "SKIP QUESTI…" on a 1440 projector.
  it('lets the skip-question control grow wider than the short controls', () => {
    render(
      <TeacherLiveControls
        isPaused={false}
        gameMode="classic"
        isQuizRound
        onPause={vi.fn()}
        onResume={vi.fn()}
        onExtendTime={vi.fn()}
        onEndRound={vi.fn()}
        onSkipWord={vi.fn()}
      />
    );
    expect(screen.getByTestId('teacher-skip-word').className).toMatch(/flex-\[1\.\d+_1_\d+rem\]/);
  });
});
