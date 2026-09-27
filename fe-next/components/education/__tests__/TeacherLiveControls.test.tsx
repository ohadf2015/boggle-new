import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { TeacherLiveControls, TEACHER_BAR_HEIGHT_VAR } from '../TeacherLiveControls';
import { IDLE_GRACE_MS } from '../controls/classActivityModel';

const mockUseLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

function setLang(language = 'en') {
  mockUseLanguage.mockReturnValue({
    language,
    t: (k: string, params?: Record<string, string | number>) =>
      params ? `${k}:${Object.values(params).join(',')}` : k,
    dir: language === 'he' ? 'rtl' : 'ltr',
  });
}

function fakeSocket() {
  const handlers: Record<string, Array<(payload: unknown) => void>> = {};
  return {
    emit: vi.fn(),
    on: vi.fn((event: string, cb: (payload: unknown) => void) => { (handlers[event] ||= []).push(cb); }),
    off: vi.fn((event: string, cb: (payload: unknown) => void) => {
      handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
    }),
    fire: (event: string, payload: unknown) => (handlers[event] || []).forEach((h) => h(payload)),
  };
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
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.style.removeProperty(TEACHER_BAR_HEIGHT_VAR);
  });

  describe('round controls', () => {
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

    it('shows a loud PAUSED state on the whole strip so the room reads it from 5m', () => {
      const { props, rerender } = renderControls();
      expect(screen.getByTestId('teacher-live-controls')).toHaveAttribute('data-paused', 'false');
      rerender(<TeacherLiveControls {...props} isPaused />);
      expect(screen.getByTestId('teacher-live-controls')).toHaveAttribute('data-paused', 'true');
      expect(screen.getByTestId('teacher-paused-flag')).toHaveTextContent('education.liveControls.pausedTitle');
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

      fireEvent.click(btn);
      expect(props.onEndRound).not.toHaveBeenCalled();
    });

    it('shows the skip-word button only in word-hunt mode', () => {
      const { props } = renderControls({ gameMode: 'word-hunt' });
      fireEvent.click(screen.getByTestId('teacher-skip-word'));
      expect(props.onSkipWord).toHaveBeenCalledTimes(1);
    });

    /**
     * The Vocab Quiz is not a `GameMode`, so `gameMode` still reads whatever
     * board the lobby last held. The server's quiz handler accepts all five
     * teacher events — `skipTargetWord` there means "skip this question"
     * (`backend/handlers/vocabQuizHandler.ts`) — so the control has to be
     * offered, under the label a teacher would expect to see in a quiz.
     */
    it('offers skip in a Vocab Quiz round, labelled as the question', () => {
      const { props } = renderControls({ isQuizRound: true, gameMode: 'classic' });
      const skip = screen.getByTestId('teacher-skip-word');
      expect(skip).toHaveTextContent('education.liveControls.skipQuestion');
      fireEvent.click(skip);
      expect(props.onSkipWord).toHaveBeenCalledTimes(1);
    });

    it('is RTL-safe: sets dir="rtl" for Hebrew', () => {
      setLang('he');
      renderControls();
      expect(screen.getByTestId('teacher-live-controls')).toHaveAttribute('dir', 'rtl');
    });

    it('every control is a real button with a 56px+ projector-grade hit area', () => {
      renderControls({ gameMode: 'word-hunt' });
      for (const b of screen.getAllByRole('button')) {
        expect(b.tagName).toBe('BUTTON');
        expect(b).toHaveAttribute('type', 'button');
        expect(b.className).toMatch(/min-h-\[?(56|60|64|72)/);
      }
    });
  });

  describe('never covers the board or leaderboard', () => {
    /**
     * Measured on the projector at 1280x633: capped at `max-w-3xl` the five
     * controls wrapped onto two rows, the strip stood 194px tall and reserved
     * 202px — roughly a third of the screen, taken straight off the board. From
     * `lg` up the row may not wrap; labels truncate instead, which also keeps
     * the longer Hebrew and Russian strings on one line.
     */
    /**
     * Measured on the live quiz projector: the host surface needs ~566px, so on
     * a 633px-tall laptop window a full-height strip pushed the answer options
     * under itself. The strip shrinks itself on short viewports instead of
     * taking the space from the board.
     */
    it('shrinks its own targets on a short viewport', () => {
      const original = window.innerHeight;
      try {
        Object.defineProperty(window, 'innerHeight', { value: 620, configurable: true });
        renderControls({ gameMode: 'word-hunt' });
        const pause = screen.getByTestId('teacher-pause-toggle');
        expect(pause.className).toContain('min-h-[56px]');
        expect(pause.className).not.toContain('lg:min-h-[72px]');
      } finally {
        Object.defineProperty(window, 'innerHeight', { value: original, configurable: true });
      }
    });

    it('keeps the full projector-grade targets when there is room', () => {
      const original = window.innerHeight;
      try {
        Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true });
        renderControls({ gameMode: 'word-hunt' });
        expect(screen.getByTestId('teacher-pause-toggle').className).toContain('lg:min-h-[72px]');
      } finally {
        Object.defineProperty(window, 'innerHeight', { value: original, configurable: true });
      }
    });

    it('holds a single row of controls at projector widths', () => {
      renderControls({ gameMode: 'word-hunt', students: [] });
      const bar = screen.getByTestId('teacher-live-controls').lastElementChild as HTMLElement;
      expect(bar.className).toContain('lg:flex-nowrap');
      expect(bar.className).toMatch(/max-w-6xl/);
      for (const b of screen.getAllByRole('button')) {
        if (b.dataset.testid === 'teacher-class-pulse') continue;
        expect(b.className).toContain('min-w-0');
      }
    });

    it('publishes its own height as a CSS var while mounted and clears it on unmount', () => {
      const { unmount } = renderControls();
      expect(document.documentElement.style.getPropertyValue(TEACHER_BAR_HEIGHT_VAR)).toMatch(/px$/);
      unmount();
      expect(document.documentElement.style.getPropertyValue(TEACHER_BAR_HEIGHT_VAR)).toBe('');
    });
  });

  describe('live class count', () => {
    const students = [
      { username: 'Teacher', isHost: true },
      { username: 'Bot Bo', isBot: true },
      { username: 'Dana' },
      { username: 'Eli' },
    ];

    it('counts students only — never the teacher or bots', () => {
      renderControls({ students, hostUsername: 'Teacher' });
      const pulse = screen.getByTestId('teacher-class-pulse');
      // Language-free numeral on the projector, full sentence on the a11y name
      // (a "{{count}} students" string mis-agrees at 1 in he/ru/es).
      expect(pulse).toHaveTextContent('2');
      expect(pulse).toHaveAttribute('aria-label', 'education.liveControls.studentsCount:2');
    });

    it('shows no idle chip on the first paint of a round', () => {
      renderControls({ students, hostUsername: 'Teacher' });
      expect(screen.queryByTestId('teacher-idle-chip')).toBeNull();
    });

    it('flags the whole class when the grace window passes with nobody scoring', () => {
      vi.useFakeTimers();
      renderControls({ students, hostUsername: 'Teacher' });
      act(() => { vi.advanceTimersByTime(IDLE_GRACE_MS + 6_000); });
      expect(screen.getByTestId('teacher-idle-chip')).toHaveAttribute(
        'aria-label',
        'education.liveControls.idleCount:2',
      );
    });

    it('shows an idle chip once a student has found nothing past the grace window', () => {
      vi.useFakeTimers();
      const socket = fakeSocket();
      renderControls({ students, hostUsername: 'Teacher', socket: socket as never });

      act(() => {
        socket.fire('updateLeaderboard', {
          leaderboard: [{ username: 'Dana', score: 8, wordsFound: 2 }],
        });
      });
      act(() => { vi.advanceTimersByTime(IDLE_GRACE_MS + 2_000); });

      const chip = screen.getByTestId('teacher-idle-chip');
      expect(chip).toHaveTextContent('1');
      expect(chip).toHaveAttribute('aria-label', 'education.liveControls.idleCount:1');
    });
  });

  describe('remove a student', () => {
    const students = [{ username: 'Teacher', isHost: true }, { username: 'Dana' }, { username: 'Eli' }];

    function openRoster(socket: ReturnType<typeof fakeSocket>) {
      renderControls({ students, hostUsername: 'Teacher', socket: socket as never });
      fireEvent.click(screen.getByTestId('teacher-class-pulse'));
      return screen.getByTestId('teacher-class-roster');
    }

    it('the class pulse opens and closes the roster sheet', () => {
      const socket = fakeSocket();
      openRoster(socket);
      expect(screen.getByTestId('teacher-class-pulse')).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(screen.getByTestId('teacher-class-pulse'));
      expect(screen.queryByTestId('teacher-class-roster')).toBeNull();
    });

    it('lists every student with a remove control', () => {
      const socket = fakeSocket();
      const roster = openRoster(socket);
      expect(within(roster).getByTestId('teacher-roster-row-Dana')).toBeTruthy();
      expect(within(roster).getByTestId('teacher-roster-row-Eli')).toBeTruthy();
      expect(within(roster).queryByTestId('teacher-roster-row-Teacher')).toBeNull();
    });

    it('removal is two-tap and only the second tap emits kickPlayer', () => {
      const socket = fakeSocket();
      const roster = openRoster(socket);
      const remove = within(roster).getByTestId('teacher-remove-Dana');

      fireEvent.click(remove);
      expect(socket.emit).not.toHaveBeenCalled();
      expect(within(roster).getByTestId('teacher-remove-confirm-Dana')).toHaveTextContent(
        'education.liveControls.removeConfirm',
      );

      fireEvent.click(within(roster).getByTestId('teacher-remove-confirm-Dana'));
      expect(socket.emit).toHaveBeenCalledWith('kickPlayer', { targetUsername: 'Dana' });
    });

    it('warns that a removed student cannot rejoin this game', () => {
      const socket = fakeSocket();
      const roster = openRoster(socket);
      fireEvent.click(within(roster).getByTestId('teacher-remove-Dana'));
      expect(within(roster).getByTestId('teacher-remove-warning-Dana')).toHaveTextContent(
        'education.liveControls.removeWarning',
      );
    });

    it('shows a removing state, then drops the row when the server confirms', () => {
      const socket = fakeSocket();
      const { rerender, props } = (() => {
        const p = {
          isPaused: false,
          gameMode: 'classic' as const,
          onPause: vi.fn(), onResume: vi.fn(), onExtendTime: vi.fn(),
          onEndRound: vi.fn(), onSkipWord: vi.fn(),
          students, hostUsername: 'Teacher', socket: socket as never,
        };
        return { ...render(<TeacherLiveControls {...p} />), props: p };
      })();

      fireEvent.click(screen.getByTestId('teacher-class-pulse'));
      fireEvent.click(screen.getByTestId('teacher-remove-Dana'));
      fireEvent.click(screen.getByTestId('teacher-remove-confirm-Dana'));
      expect(screen.getByTestId('teacher-roster-row-Dana')).toHaveAttribute('data-status', 'removing');

      act(() => { socket.fire('playerKicked', { username: 'Dana', reason: 'host' }); });
      rerender(
        <TeacherLiveControls {...props} students={[{ username: 'Teacher', isHost: true }, { username: 'Eli' }]} />,
      );
      expect(screen.queryByTestId('teacher-roster-row-Dana')).toBeNull();
    });
  });
});
