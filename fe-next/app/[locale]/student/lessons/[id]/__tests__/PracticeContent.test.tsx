/**
 * PracticeContent — the picker/round state machine, on its own.
 *
 * The page shell (auth, lesson fetch, the dead-link card) and the practice loop
 * used to be one 482-line file, which is both over this repo's size ceiling and
 * impossible to test without standing up Supabase-shaped hooks. The loop now
 * lives in its own module, so the three transitions that make it a loop —
 * picker → round, round → back, round → next round — can be asserted directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

const { mockPush, mockStartSession, completeSpy, dismissLevelUp } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockStartSession: vi.fn().mockResolvedValue({ success: true }),
  completeSpy: vi.fn(),
  dismissLevelUp: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/dynamic', () => ({ __esModule: true, default: () => () => null }));
vi.mock('@/hooks/usePracticeSession', () => ({
  usePracticeWords: (words: unknown[]) => ({ words: words ?? [], level: 'core', isLevelLoading: false }),
}));
vi.mock('@/components/education/PracticeSessionProvider', () => ({
  usePracticeSession: () => ({
    totalXp: 120,
    streak: { currentStreak: 3 },
    sessionXpEarned: 20,
    sessionMasteryMessage: null,
    completePracticeSession: completeSpy,
    levelUpData: null,
    dismissLevelUp,
  }),
}));
vi.mock('@/components/education/XpProgressBar', () => ({ __esModule: true, default: () => <div>xp</div> }));
vi.mock('@/components/education/StreakBonusIndicator', () => ({
  __esModule: true,
  default: () => <div data-testid="streak-indicator">streak</div>,
}));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div>header</div> }));

vi.mock('@/components/education/practicePicker/PracticePicker', () => ({
  __esModule: true,
  default: ({ onSelectMode, onBack }: {
    onSelectMode: (mode: string) => void;
    onBack: () => void;
  }) => (
    <div data-testid="picker">
      <button type="button" data-testid="pick-spelling" onClick={() => onSelectMode('spelling')}>
        spelling
      </button>
      <button type="button" data-testid="picker-back" onClick={onBack}>back</button>
    </div>
  ),
}));

vi.mock('@/components/education/practice/PracticeModeStage', () => ({
  __esModule: true,
  default: ({ mode, variant, onBack }: { mode: string; variant: string | null; onBack: () => void }) => (
    <div data-testid="stage" data-mode={mode} data-variant={variant ?? ''}>
      <button type="button" data-testid="stage-back" onClick={onBack}>leave</button>
    </div>
  ),
}));

import PracticeContent from '../PracticeContent';

const LESSON = {
  id: 'lesson-1',
  name: 'Week 3 Vocabulary',
  language: 'en' as const,
  words: [
    { word: 'ox', definition: 'a strong farm animal' },
    { word: 'harvest', definition: 'to gather crops' },
  ],
};

function renderContent(overrides: Record<string, unknown> = {}) {
  const props = {
    lesson: LESSON,
    language: 'en',
    isRTL: false,
    progress: {} as never,
    mastery: 'learning' as never,
    startSession: mockStartSession as never,
    router: { push: mockPush } as never,
    initialMode: null,
    initialFocus: null,
    onGuestResult: vi.fn(),
    ...overrides,
  };
  return render(<PracticeContent {...(props as React.ComponentProps<typeof PracticeContent>)} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PracticeContent', () => {
  it('GIVEN no mode chosen WHEN it renders THEN the picker is the screen', () => {
    renderContent();
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(screen.queryByTestId('stage')).not.toBeInTheDocument();
  });

  it('GIVEN the picker WHEN a mode is chosen THEN that round opens and the session starts', async () => {
    const user = userEvent.setup();
    renderContent();

    await user.click(screen.getByTestId('pick-spelling'));

    expect(await screen.findByTestId('stage')).toHaveAttribute('data-mode', 'spelling');
    expect(mockStartSession).toHaveBeenCalledWith('spelling', undefined);
    // A level-up owed to a previous round must not follow the student in.
    expect(dismissLevelUp).toHaveBeenCalled();
  });

  it('GIVEN an open round WHEN the student leaves THEN the picker comes back', async () => {
    const user = userEvent.setup();
    renderContent();

    await user.click(screen.getByTestId('pick-spelling'));
    await screen.findByTestId('stage');
    await user.click(screen.getByTestId('stage-back'));

    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(screen.queryByTestId('stage')).not.toBeInTheDocument();
  });

  it('GIVEN a Word Craft assignment link WHEN it opens THEN Word Craft starts as a solo_board session with the wordcraft variant', async () => {
    renderContent({ initialMode: 'solo_board', initialVariant: 'wordcraft' });
    const stage = await screen.findByTestId('stage');
    expect(stage).toHaveAttribute('data-mode', 'solo_board');
    expect(stage).toHaveAttribute('data-variant', 'wordcraft');
    expect(mockStartSession).toHaveBeenCalledWith('solo_board', { variant: 'wordcraft' });
  });

  it('GIVEN a deep link WHEN it carries a mode THEN the round opens without a picker tap', async () => {
    renderContent({ initialMode: 'blitz' });
    expect(await screen.findByTestId('stage')).toHaveAttribute('data-mode', 'blitz');
    expect(mockStartSession).toHaveBeenCalledWith('blitz', undefined);
  });

  it('GIVEN the server refuses to start a session (e.g. 403) WHEN a mode is picked THEN the failure is surfaced, not swallowed', async () => {
    mockStartSession.mockResolvedValueOnce({ success: false, error: 'Not authorized to practice this lesson' });
    const user = userEvent.setup();
    renderContent();

    await user.click(screen.getByTestId('pick-spelling'));

    expect(await screen.findByRole('alert')).toHaveTextContent('education.practice.startFailed');
    // No broken round left on screen — back on the picker.
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(screen.queryByTestId('stage')).not.toBeInTheDocument();
  });

  it('GIVEN a deep link WHEN the server refuses to start it THEN the picker shows with the failure message', async () => {
    mockStartSession.mockResolvedValueOnce({ success: false, error: 'Not authorized to practice this lesson' });
    renderContent({ initialMode: 'blitz' });

    expect(await screen.findByRole('alert')).toHaveTextContent('education.practice.startFailed');
    expect(screen.getByTestId('picker')).toBeInTheDocument();
    expect(screen.queryByTestId('stage')).not.toBeInTheDocument();
  });
});
