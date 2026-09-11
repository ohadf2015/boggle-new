/**
 * What a STUDENT sees in a classroom lobby.
 *
 * Two faults, one cause. `lessonData` is read from `lessonGameData` in the
 * TEACHER's sessionStorage, so a student's copy is always null and every tile
 * fell back to a default: mode "Classic" and classic settings, in the middle of
 * a Vocab Quiz, under a heading that read "Classroom Session" instead of the
 * class's name. Recurring pitfall class 1 — one value, two sources, and the
 * student's source never existed.
 *
 * On top of that the student was shown the host's own controls: the six-digit
 * share code, the copy button and the QR poster. Those belong to whoever is
 * running the room, not to the phone that scanned it.
 *
 * The room's Redis record already holds mode, settings and lesson names, and
 * `/api/education/classroom/live-game` serves them; `liveGame` here is that
 * answer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomModeBanner } from '../ClassroomModeBanner';
import * as LanguageContext from '@/contexts/LanguageContext';

const mockUseLanguage = vi.fn();

/** The teacher's own sessionStorage copy — its presence is what forces the projector. */
const TEACHER_LESSON = {
  lessonId: 'l1',
  lessonName: 'Week 3 Vocabulary',
  vocabularyWords: ['abandon'],
  language: 'en' as const,
};

const liveQuiz = {
  gameCode: 'JATS5Z',
  classroomId: 'c1',
  classroomName: 'ELA Period 3',
  lessonNames: ['Week 3 Vocabulary'],
  gameMode: 'vocab-quiz' as const,
  settings: {
    timerMinutes: null,
    boardSize: null,
    allowLateJoin: true,
    vocabQuizQuestionCount: 8,
    vocabQuizSeconds: 25,
  },
};

function renderBanner(props: Partial<React.ComponentProps<typeof ClassroomModeBanner>>) {
  mockUseLanguage.mockReturnValue({
    language: 'en',
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
    dir: 'ltr',
    setLanguage: vi.fn(),
    currentFlag: '🇺🇸',
  });
  vi.spyOn(LanguageContext, 'useLanguage').mockImplementation(mockUseLanguage);

  return render(
    <ClassroomModeBanner lessonData={null} gameCode="JATS5Z" expanded {...props} />
  );
}

describe('ClassroomModeBanner — the student half of a classroom lobby', () => {
  beforeEach(() => vi.clearAllMocks());

  it('names the classroom instead of saying "Classroom Session"', () => {
    renderBanner({ isHost: false, liveGame: liveQuiz });
    expect(screen.getByText('ELA Period 3')).toBeTruthy();
    expect(screen.queryByText('education.classroomGame.classroomSession')).toBeNull();
  });

  it('falls back to the generic label when the server has no name for the class', () => {
    renderBanner({ isHost: false, liveGame: { ...liveQuiz, classroomName: null } });
    expect(screen.getByText('education.classroomGame.classroomSession')).toBeTruthy();
  });

  it('announces the mode the teacher chose, not Classic', () => {
    renderBanner({ isHost: false, liveGame: liveQuiz });
    expect(screen.getByText('teacher.classroom.gameModes.vocabQuiz')).toBeTruthy();
    expect(screen.queryByText('teacher.classroom.gameModes.classic')).toBeNull();
  });

  it('summarises the quiz settings, not the board settings', () => {
    renderBanner({ isHost: false, liveGame: liveQuiz });
    expect(screen.getByTestId('classroom-quiz-question-count').textContent).toContain('8');
    expect(screen.getByTestId('classroom-quiz-seconds').textContent).toContain('25');
    // A quiz has no grid. Printing a board size next to it is a lie about the game.
    expect(screen.queryByText('6×6')).toBeNull();
  });

  it('shows the lesson the class is playing', () => {
    renderBanner({ isHost: false, liveGame: liveQuiz });
    expect(screen.getAllByText('Week 3 Vocabulary').length).toBeGreaterThan(0);
  });

  /**
   * The vocabulary list is deliberately not served to students — it is the
   * answer key. But the word-count line was unguarded, so a student's panel
   * announced "0 words" next to a ten-word lesson. Say nothing rather than
   * something false.
   */
  it('does not claim the lesson has zero words when it simply was not sent one', () => {
    renderBanner({ isHost: false, liveGame: liveQuiz });
    expect(screen.queryByText(/education\.classroomGame\.words/)).toBeNull();
  });

  it('hides the host-only share code, copy button and QR poster', () => {
    renderBanner({ isHost: false, liveGame: liveQuiz });
    expect(screen.queryByTestId('qr-code-wrapper')).toBeNull();
    expect(screen.queryByText('education.classroomGame.shareCode')).toBeNull();
    expect(screen.queryByText('JATS5Z')).toBeNull();
  });

  /**
   * The teacher's half moved OUT of this component. A classroom host in the
   * lobby is looking at `components/education/projector/ProjectorLobby`, which
   * prints the code at 12vw with one QR and one copy button; the banner used to
   * draw a second, smaller code and QR directly above it. It now stands down —
   * see ClassroomModeBanner.projectorOwnsJoin.test.tsx for that contract, and
   * ProjectorJoinPanel.test.tsx for the address/clipboard guarantees that came
   * with it.
   */
  it('stands down for the teacher on the projector — that surface owns the code', () => {
    const { container } = renderBanner({ isHost: true, liveGame: liveQuiz, lessonData: TEACHER_LESSON });
    expect(container).toBeEmptyDOMElement();
  });

  it('treats an unspecified viewer as the host, so the teacher screen cannot regress', () => {
    renderBanner({ liveGame: null });
    expect(screen.getByText('education.classroomGame.shareCode')).toBeTruthy();
  });

  it('still carries the code for a teacher whose tab has no lesson copy (no projector)', () => {
    renderBanner({ isHost: true, liveGame: liveQuiz, lessonData: null });
    expect(screen.getByText('education.classroomGame.shareCode')).toBeTruthy();
    expect(screen.getByText('JATS5Z')).toBeTruthy();
  });

  /**
   * The lookup can fail: the rate limit is per IP and a whole class shares one
   * school IP, so the tail of a 40-student class can be 429'd. With no answer,
   * every default is classic-shaped — which is the exact wrong screen this whole
   * change exists to remove, restored silently. Class 4: a failure that looks
   * like an answer. Say nothing instead.
   */
  it('shows no settings at all to a student the server could not answer', () => {
    renderBanner({ isHost: false, liveGame: null });
    expect(screen.queryByText('6×6')).toBeNull();
    expect(screen.queryByText('teacher.classroom.gameModes.classic')).toBeNull();
    expect(screen.queryByText('education.classroomGame.gameSettings')).toBeNull();
  });

  it('shows board settings for a student in a board-mode classroom game', () => {
    renderBanner({
      isHost: false,
      liveGame: {
        ...liveQuiz,
        gameMode: 'classic',
        settings: { ...liveQuiz.settings, timerMinutes: 3, boardSize: 'large' },
      },
    });
    expect(screen.getByText('7×7')).toBeTruthy();
    expect(screen.queryByTestId('classroom-quiz-question-count')).toBeNull();
  });
});
