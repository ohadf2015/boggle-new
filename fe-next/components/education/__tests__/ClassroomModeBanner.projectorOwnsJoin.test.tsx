/**
 * The banner stands down when the projector lobby is up.
 *
 * A classroom host used to get the SAME session announced twice on one screen:
 * this banner's expanded panel (join code, QR, copy button, settings) and,
 * immediately below it, `TvLobbyView`/`TvJoinBar` with its own code, its own QR
 * and its own address — different sizes, different colours, both live. On a
 * projector that is two codes on one wall.
 *
 * A classroom room can only ever be in TV mode (`useHostViewState` hard-forces
 * `hostPlaying=false` whenever `hasLessonData`, and never writes that back to
 * localStorage), so "host + expanded" IS "the projector lobby is mounted" —
 * derived, not signalled, so there is no late flip to flash (pitfall class 1).
 *
 * `expanded` is `!gameActive`, and `gameActive` stays true through the results
 * screen (only `resetForNewRound` clears it), so this deferral is scoped to the
 * LOBBY. The results screen keeps whatever chrome it had.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassroomModeBanner } from '../ClassroomModeBanner';
import * as LanguageContext from '@/contexts/LanguageContext';

/**
 * The teacher's own copy of the session, read from `lessonGameData` in
 * sessionStorage. Its presence is exactly what makes `useHostViewState` force
 * TV mode, so it is also exactly what tells this banner the projector is up.
 */
const TEACHER_LESSON = {
  lessonId: 'l1',
  lessonName: 'Week 3 Vocabulary',
  vocabularyWords: ['abandon', 'brittle'],
  language: 'en' as const,
};

const liveGame = {
  gameCode: 'JATS5Z',
  classroomId: 'c1',
  classroomName: 'ELA Period 3',
  lessonNames: ['Week 3 Vocabulary'],
  gameMode: 'classic' as const,
  settings: {
    timerMinutes: 3,
    boardSize: 'large' as const,
    allowLateJoin: true,
    vocabQuizQuestionCount: null,
    vocabQuizSeconds: null,
  },
};

function renderBanner(props: Partial<React.ComponentProps<typeof ClassroomModeBanner>>) {
  vi.spyOn(LanguageContext, 'useLanguage').mockReturnValue({
    language: 'en',
    t: (key: string) => key,
    dir: 'ltr',
    setLanguage: vi.fn(),
    currentFlag: '🇺🇸',
  } as unknown as ReturnType<typeof LanguageContext.useLanguage>);

  return render(
    <ClassroomModeBanner lessonData={TEACHER_LESSON} gameCode="JATS5Z" expanded {...props} />
  );
}

describe('ClassroomModeBanner — the projector owns the classroom lobby', () => {
  it('renders nothing for a teacher in the lobby', () => {
    const { container } = renderBanner({ isHost: true, liveGame });
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to the host, so an unspecified viewer also gets the single surface', () => {
    const { container } = renderBanner({ liveGame });
    expect(container).toBeEmptyDOMElement();
  });

  it('prints no second game code anywhere on the teacher screen', () => {
    const { container } = renderBanner({ isHost: true, liveGame });
    expect(container.textContent).not.toContain('JATS5Z');
  });

  it('still speaks for the teacher once play starts and the panel collapses', () => {
    renderBanner({ isHost: true, liveGame, expanded: false });
    expect(screen.getByText('ELA Period 3')).toBeInTheDocument();
  });

  it('keeps carrying the code for a host with no lesson copy in this tab', () => {
    // Second window / mirrored device: no `lessonGameData`, so `hasLessonData`
    // is false, `HostPreGameView` renders instead of the projector, and this
    // banner is the only surface with the code. It must NOT stand down.
    renderBanner({ isHost: true, liveGame, lessonData: null });
    expect(screen.getByText('education.classroomGame.shareCode')).toBeInTheDocument();
    expect(screen.getByText('JATS5Z')).toBeInTheDocument();
  });

  it('leaves the student lobby alone — they have no projector of their own', () => {
    renderBanner({ isHost: false, lessonData: null, liveGame });
    expect(screen.getByText('education.classroomGame.gameSettings')).toBeInTheDocument();
    expect(screen.getByText('7×7')).toBeInTheDocument();
  });
});
