/**
 * Teacher strip — paused state and the safety of END (RED first).
 *
 * Captured on a live quiz (HBQ23H, 780px wide, Hebrew): the projector said
 * "paused" twice — the purple banner on the wall AND a static black
 * "המשחק מושהה" box in the strip's primary slot — while the real Resume was a
 * squeezed button in the middle of the row. END sat in the same row, the same
 * size and the same loud pink as everything else, one slip from Resume.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeacherLiveControls } from '../TeacherLiveControls';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'he', t: (k: string) => k, dir: 'rtl' }),
}));

function renderControls(isPaused: boolean) {
  const onResume = vi.fn();
  render(
    <TeacherLiveControls
      isPaused={isPaused}
      isQuizRound
      onPause={vi.fn()}
      onResume={onResume}
      onExtendTime={vi.fn()}
      onEndRound={vi.fn()}
      onSkipWord={vi.fn()}
      students={[]}
      hostUsername="teacher"
      socket={null}
    />
  );
  return { onResume };
}

/** Interactive controls in DOM (= reading) order. */
function buttonOrder(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.getAttribute('data-testid') ?? '');
}

describe('TeacherLiveControls — paused', () => {
  it('drops the static paused label: the wall banner already says it', () => {
    renderControls(true);
    expect(screen.queryByTestId('teacher-paused-flag')).toBeNull();
  });

  it('makes Resume the primary action: first in the row and the widest control', () => {
    const { onResume } = renderControls(true);
    const resume = screen.getByTestId('teacher-pause-toggle');
    expect(resume).toHaveTextContent('education.liveControls.resume');
    expect(resume.className).toContain('flex-[2');

    const order = buttonOrder().filter((id) => id !== 'teacher-class-pulse');
    expect(order[0]).toBe('teacher-pause-toggle');

    fireEvent.click(resume);
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('keeps Pause in its ordinary slot while the round runs', () => {
    renderControls(false);
    expect(screen.getByTestId('teacher-pause-toggle').className).not.toContain('flex-[2');
  });
});

describe('TeacherLiveControls — END is set apart', () => {
  it.each([false, true])('sits alone at the far end of the row (paused=%s)', (paused) => {
    renderControls(paused);
    const order = buttonOrder();
    expect(order[order.length - 1]).toBe('teacher-end-round');
    const end = screen.getByTestId('teacher-end-round');
    // Pushed to the inline end and separated from the cluster, not stretched
    // to the same width as Resume.
    expect(end.parentElement?.className).toContain('ms-auto');
    expect(end.className).not.toContain('flex-1');
  });

  it('carries less visual weight than the primary controls until armed', () => {
    renderControls(false);
    const end = screen.getByTestId('teacher-end-round');
    // Outlined, not filled: pink text on the cream strip measures ~3.5:1, so
    // the danger cue is the pink border and the label stays black.
    expect(end.className).not.toContain('bg-neo-pink');
    expect(end.className).toContain('border-neo-pink');
    expect(end.className).toContain('shadow-none');

    fireEvent.click(end);
    expect(end).toHaveAttribute('data-armed', 'true');
    expect(end.className).toContain('bg-neo-red');
  });
});

describe('TeacherLiveControls — add time says "time"', () => {
  it('shows a clock next to the plus', () => {
    renderControls(false);
    const extend = screen.getByTestId('teacher-extend-time');
    expect(extend.querySelector('[data-testid="teacher-extend-time-clock"]')).not.toBeNull();
  });
});
