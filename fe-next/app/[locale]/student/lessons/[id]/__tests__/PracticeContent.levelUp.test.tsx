import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => (p: { levelUpData?: { newLevel: number } | null; onClose?: () => void; show?: boolean }) => {
    if (p.levelUpData) return <button type="button" data-testid="edu-level-up" onClick={p.onClose}>{p.levelUpData.newLevel}</button>;
    if (p.show) return <div data-testid="global-level-up" />;
    return null;
  },
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }) }));
vi.mock('@/hooks/usePracticeSession', () => ({
  usePracticeWords: (words: unknown[]) => ({ words: words ?? [], level: 'core', isLevelLoading: false }),
}));
vi.mock('@/components/education/PracticeSessionProvider', () => ({
  usePracticeSession: () => ({
    totalXp: 120, streak: { currentStreak: 3 }, sessionXpEarned: 20, sessionMasteryMessage: null,
    completePracticeSession: vi.fn(),
  }),
}));
vi.mock('@/components/education/XpProgressBar', () => ({ __esModule: true, default: () => <div>xp</div> }));
vi.mock('@/components/education/StreakBonusIndicator', () => ({ __esModule: true, default: () => null }));
vi.mock('@/components/education/EducationHeader', () => ({ EducationHeader: () => <div>header</div> }));
vi.mock('@/components/education/practicePicker/PracticePicker', () => ({ __esModule: true, default: () => <div data-testid="picker" /> }));

import PracticeContent from '../PracticeContent';
import { LevelUpWatcher } from '@/components/progression/LevelUpWatcher';
import { publishLevelUp } from '@/lib/avatar/revealTrigger';
import { __resetLevelUpBusForTests, getPendingLevelUp } from '@/lib/levelUp/levelUpBus';

const props = {
  lesson: { id: 'lesson-1', name: 'Week 3', language: 'en', words: [] },
  language: 'en', isRTL: false, progress: {}, mastery: 'learning', startSession: vi.fn(),
  router: { push: vi.fn() }, initialMode: null, initialFocus: null, onGuestResult: vi.fn(),
} as unknown as React.ComponentProps<typeof PracticeContent>;

describe('PracticeContent — one level-up celebration', () => {
  beforeEach(() => __resetLevelUpBusForTests());

  it('given a practice level-up on the shared bus, when the watcher is mounted too, then only the practice celebration shows', () => {
    render(<><LevelUpWatcher /><PracticeContent {...props} /></>);
    act(() => { publishLevelUp({ oldLevel: 4, newLevel: 5 }, 'practice'); });

    expect(screen.getAllByTestId('edu-level-up')).toHaveLength(1);
    expect(screen.getByTestId('edu-level-up')).toHaveTextContent('5');
    expect(screen.queryByTestId('global-level-up')).toBeNull();
    expect(getPendingLevelUp()).toBeNull();

    fireEvent.click(screen.getByTestId('edu-level-up'));
    expect(screen.queryByTestId('edu-level-up')).toBeNull();
  });
});
