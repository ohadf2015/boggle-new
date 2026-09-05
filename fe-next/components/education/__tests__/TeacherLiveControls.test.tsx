import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TeacherLiveControls } from '../TeacherLiveControls';

const mockUseLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

function setLang(language = 'en') {
  mockUseLanguage.mockReturnValue({ language, t: (k: string) => k, dir: language === 'he' ? 'rtl' : 'ltr' });
}

function renderControls(overrides: Partial<React.ComponentProps<typeof TeacherLiveControls>> = {}) {
  const props = {
    isPaused: false,
    gameMode: 'classic' as const,
    onPause: vi.fn(),
    onResume: vi.fn(),
    onExtendTime: vi.fn(),
    onEndRound: vi.fn(),
    onSkipWord: vi.fn(),
    ...overrides,
  };
  const utils = render(<TeacherLiveControls {...props} />);
  return { ...utils, props };
}

describe('TeacherLiveControls', () => {
  beforeEach(() => setLang('en'));
  afterEach(() => vi.useRealTimers());

  it('renders a labelled toolbar with pause, +30s and end-round buttons (no skip in classic)', () => {
    renderControls();
    const bar = screen.getByTestId('teacher-live-controls');
    expect(bar).toHaveAttribute('role', 'toolbar');
    expect(bar).toHaveAttribute('aria-label', 'education.liveControls.title');
    expect(screen.getByTestId('teacher-pause-toggle')).toHaveTextContent('education.liveControls.pause');
    expect(screen.getByTestId('teacher-extend-time')).toHaveTextContent('education.liveControls.addTime');
    expect(screen.getByTestId('teacher-end-round')).toHaveTextContent('education.liveControls.endRound');
    expect(screen.queryByTestId('teacher-skip-word')).toBeNull();
  });

  it('pause/resume is a single toggle driven by isPaused', () => {
    const { props, rerender } = renderControls();
    fireEvent.click(screen.getByTestId('teacher-pause-toggle'));
    expect(props.onPause).toHaveBeenCalledTimes(1);
    expect(props.onResume).not.toHaveBeenCalled();

    rerender(<TeacherLiveControls {...props} isPaused />);
    const toggle = screen.getByTestId('teacher-pause-toggle');
    expect(toggle).toHaveTextContent('education.liveControls.resume');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(props.onResume).toHaveBeenCalledTimes(1);
  });

  it('+30s calls onExtendTime(30)', () => {
    const { props } = renderControls();
    fireEvent.click(screen.getByTestId('teacher-extend-time'));
    expect(props.onExtendTime).toHaveBeenCalledWith(30);
  });

  it('end round needs a second tap: first arms ("tap again"), second fires', () => {
    const { props } = renderControls();
    const btn = screen.getByTestId('teacher-end-round');

    fireEvent.click(btn);
    expect(props.onEndRound).not.toHaveBeenCalled();
    expect(btn).toHaveTextContent('education.liveControls.endRoundConfirm');
    expect(btn).toHaveAttribute('data-armed', 'true');

    fireEvent.click(btn);
    expect(props.onEndRound).toHaveBeenCalledTimes(1);
    expect(btn).toHaveAttribute('data-armed', 'false');
  });

  it('a stale armed end-round disarms itself after a few seconds', () => {
    vi.useFakeTimers();
    const { props } = renderControls();
    const btn = screen.getByTestId('teacher-end-round');

    fireEvent.click(btn);
    act(() => { vi.advanceTimersByTime(4_500); });
    expect(btn).toHaveTextContent('education.liveControls.endRound');

    fireEvent.click(btn); // re-arms, does not fire
    expect(props.onEndRound).not.toHaveBeenCalled();
  });

  it('shows the skip-word button only in word-hunt mode', () => {
    const { props } = renderControls({ gameMode: 'word-hunt' });
    const skip = screen.getByTestId('teacher-skip-word');
    fireEvent.click(skip);
    expect(props.onSkipWord).toHaveBeenCalledTimes(1);
  });

  it('is RTL-safe: sets dir="rtl" for Hebrew', () => {
    setLang('he');
    renderControls();
    expect(screen.getByTestId('teacher-live-controls')).toHaveAttribute('dir', 'rtl');
  });

  it('every control is a real button (keyboard accessible) with a 44px+ hit area class', () => {
    renderControls({ gameMode: 'word-hunt' });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    for (const b of buttons) {
      expect(b.tagName).toBe('BUTTON');
      expect(b).toHaveAttribute('type', 'button');
      expect(b.className).toMatch(/min-h-\[?(44|48|52|56)/);
    }
  });
});
