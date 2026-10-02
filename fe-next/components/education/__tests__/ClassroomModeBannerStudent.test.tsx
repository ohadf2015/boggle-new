import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomModeBanner } from '../ClassroomModeBanner';
import { studentModeCopy } from '../ClassroomModeBannerStudent';
import * as LanguageContext from '@/contexts/LanguageContext';

const liveGame = (gameMode: 'vocab-quiz' | 'classic' | 'wordcraft') => ({
  gameCode: 'JATS5Z',
  classroomId: 'c1',
  classroomName: 'ELA Period 3',
  lessonNames: ['Week 3 Vocabulary'],
  gameMode,
  settings: {
    timerMinutes: 3,
    boardSize: 'medium',
    allowLateJoin: true,
    vocabQuizQuestionCount: gameMode === 'vocab-quiz' ? 8 : null,
    vocabQuizSeconds: gameMode === 'vocab-quiz' ? 25 : null,
  },
});

function renderBanner(props: Partial<React.ComponentProps<typeof ClassroomModeBanner>>) {
  vi.spyOn(LanguageContext, 'useLanguage').mockReturnValue({
    language: 'en',
    t: (key: string) => key,
    dir: 'ltr',
  } as unknown as ReturnType<typeof LanguageContext.useLanguage>);
  return render(<ClassroomModeBanner lessonData={null} gameCode="JATS5Z" expanded {...props} />);
}

describe('ClassroomModeBanner - the student mode strip', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('tells a quiz student what to do in one line', () => {
    renderBanner({ isHost: false, liveGame: liveGame('vocab-quiz') });
    expect(screen.getByTestId('student-mode-strip')).toBeTruthy();
    expect(screen.getByText('eduStudent.mode.vocabQuiz.rule')).toBeTruthy();
  });

  it('uses the round rule copy for a board mode', () => {
    renderBanner({ isHost: false, liveGame: liveGame('classic') });
    expect(screen.getByText('mpUi.round.mode.classic.rule')).toBeTruthy();
  });

  it('gives wordcraft its own rule, not the classic one', () => {
    renderBanner({ isHost: false, liveGame: liveGame('wordcraft') });
    expect(screen.getByText('eduStudent.mode.wordcraft.rule')).toBeTruthy();
    expect(screen.queryByText('mpUi.round.mode.classic.rule')).toBeNull();
  });

  it('drops the host-only late-join tile students never act on', () => {
    renderBanner({ isHost: false, liveGame: liveGame('classic') });
    expect(screen.queryByText('education.template.lateJoin')).toBeNull();
  });

  it('stands down on the results screen so the student podium owns the phone', () => {
    renderBanner({ isHost: false, liveGame: liveGame('classic'), showResults: true });
    expect(screen.queryByTestId('student-mode-strip')).toBeNull();
    expect(screen.getByText('ELA Period 3')).toBeTruthy();
  });

  it('keeps the host panel on the results screen', () => {
    renderBanner({ isHost: true, liveGame: liveGame('classic'), showResults: true });
    expect(screen.getByText('education.classroomGame.shareCode')).toBeTruthy();
  });
});

describe('studentModeCopy', () => {
  it('maps every classroom mode to a name and a rule key', () => {
    for (const mode of ['classic', 'word-hunt', 'blast', 'wheel-rush', 'vocab-quiz', 'wordcraft'] as const) {
      const copy = studentModeCopy(mode);
      expect(copy.nameKey).toMatch(/\S/);
      expect(copy.ruleKey).toMatch(/\S/);
    }
    expect(studentModeCopy('word-hunt').ruleKey).toBe('mpUi.round.mode.wordHunt.rule');
  });
});
