import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomModeBanner } from '../ClassroomModeBanner';
import * as LanguageContext from '@/contexts/LanguageContext';
import type { LiveClassroomGameInfo } from '@/lib/education/liveClassroomGameInfo';

const mockUseLanguage = vi.fn();

function makeLiveGame(pressure: { leaderboard: 'full' | 'top3' | 'hidden'; timer: 'full' | 'gentle' | 'off'; speedScoring: boolean } | null, gameMode: 'classic' | 'vocab-quiz' = 'classic'): LiveClassroomGameInfo {
  return {
    gameCode: 'ABC123',
    classroomId: 'cls-1',
    classroomName: 'Room 4',
    lessonNames: ['Animals'],
    gameMode,
    settings: {
      timerMinutes: 3,
      boardSize: 'medium',
      allowLateJoin: true,
      vocabQuizQuestionCount: gameMode === 'vocab-quiz' ? 10 : null,
      vocabQuizSeconds: gameMode === 'vocab-quiz' ? 15 : null,
      pressure,
    },
  } as LiveClassroomGameInfo;
}

describe('ClassroomModeBanner - pressure dials in the pre-game settings panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLanguage.mockReturnValue({
      language: 'en',
      t: (key: string, params?: Record<string, string | number>) =>
        params ? `${key}:${JSON.stringify(params)}` : key,
      dir: 'ltr',
      setLanguage: vi.fn(),
      currentFlag: '🇺🇸',
    });
    vi.spyOn(LanguageContext, 'useLanguage').mockImplementation(mockUseLanguage);
  });

  it('omits the TIMER row when the teacher turned the timer off', () => {
    render(
      <ClassroomModeBanner
        lessonData={null}
        gameCode="ABC123"
        expanded={true}
        liveGame={makeLiveGame({ leaderboard: 'full', timer: 'off', speedScoring: true })}
      />
    );

    expect(screen.queryByText('education.template.timer')).toBeNull();
  });

  it('keeps the TIMER row under the loud default', () => {
    render(
      <ClassroomModeBanner
        lessonData={null}
        gameCode="ABC123"
        expanded={true}
        liveGame={makeLiveGame({ leaderboard: 'full', timer: 'full', speedScoring: true })}
      />
    );

    expect(screen.getByText('education.template.timer')).toBeInTheDocument();
  });

  it('omits the per-question seconds row in a quiz when the timer is off', () => {
    render(
      <ClassroomModeBanner
        lessonData={null}
        gameCode="ABC123"
        expanded={true}
        liveGame={makeLiveGame({ leaderboard: 'full', timer: 'off', speedScoring: true }, 'vocab-quiz')}
      />
    );

    expect(screen.queryByText('education.classroomGame.perQuestion')).toBeNull();
    expect(screen.getByText('education.classroomGame.questions')).toBeInTheDocument();
  });

  it('keeps the per-question seconds row in a quiz under the loud default', () => {
    render(
      <ClassroomModeBanner
        lessonData={null}
        gameCode="ABC123"
        expanded={true}
        liveGame={makeLiveGame(null, 'vocab-quiz')}
      />
    );

    expect(screen.getByText('education.classroomGame.perQuestion')).toBeInTheDocument();
  });
});
