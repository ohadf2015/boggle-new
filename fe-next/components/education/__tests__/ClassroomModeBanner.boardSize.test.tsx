/**
 * The lobby must report the board size the teacher actually chose.
 *
 * `ClassroomSetupStep` offers Small (5×5), Medium (6×6), Large (7×7) and
 * defaults to Medium. `ClassroomGameLobby` puts that choice on
 * `templateSettings.difficulty` verbatim, so the value arrives here intact —
 * but `boardSizeLabel` was reading it against an older 4×4/5×5/6×6 scale and
 * had no `medium` case at all, so Medium fell through to the default and the
 * lobby said 5×5.
 *
 * Every size was mislabelled by one step. Reported as "Board Size silently
 * reverted from Medium to 5×5"; nothing reverted, the label was wrong.
 * Reproduced live on 2026-09-06: teacher picked Medium (6×6), lobby said 5×5.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomModeBanner } from '../ClassroomModeBanner';
import * as LanguageContext from '@/contexts/LanguageContext';

const mockUseLanguage = vi.fn();

function renderWithSize(difficulty: 'small' | 'medium' | 'large' | undefined) {
  mockUseLanguage.mockReturnValue({
    language: 'en',
    t: (key: string) => key,
    dir: 'ltr',
    setLanguage: vi.fn(),
    currentFlag: '🇺🇸',
  });
  vi.spyOn(LanguageContext, 'useLanguage').mockImplementation(mockUseLanguage);

  render(
    <ClassroomModeBanner
      lessonData={{
        lessonId: '123',
        lessonName: 'Week 3 Vocabulary',
        vocabularyWords: [],
        language: 'en' as const,
        templateSettings: {
          timerSeconds: 180,
          difficulty,
          minWordLength: 3,
          allowLateJoin: true,
        },
      }}
      gameCode="JATS5Z"
      expanded
    />
  );
}

describe('ClassroomModeBanner — board size label matches the setup screen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('labels Medium as 6×6, the size the setup screen offers', () => {
    renderWithSize('medium');
    expect(screen.getByText('6×6')).toBeTruthy();
  });

  it('labels Small as 5×5', () => {
    renderWithSize('small');
    expect(screen.getByText('5×5')).toBeTruthy();
  });

  it('labels Large as 7×7', () => {
    renderWithSize('large');
    expect(screen.getByText('7×7')).toBeTruthy();
  });

  it('falls back to the setup screen default (Medium) when nothing was recorded', () => {
    renderWithSize(undefined);
    expect(screen.getByText('6×6')).toBeTruthy();
  });
});
