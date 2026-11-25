import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const demoState = {
  phase: 'playing' as const,
  grid: [
    ['c', 'a', 't', 'x'],
    ['q', 'z', 'q', 'z'],
    ['x', 'q', 'z', 'q'],
    ['z', 'x', 'q', 'z'],
  ],
  lvl: { seconds: 60, stars: [10, 20, 30], kind: 'normal' },
  words: [] as string[],
  score: 0,
  msLeft: 60_000,
  result: null,
  combat: null,
  combatFx: [],
  start: vi.fn(),
  submit: vi.fn(async () => ({ ok: true })),
};

const coachArgs = vi.hoisted(() => ({ last: null as null | { active: boolean; wordsFound: number } }));

vi.mock('../useAdventureDemo', () => ({ useAdventureDemo: () => demoState }));
vi.mock('@/components/adventure/play/useWordChecker', () => ({ useWordChecker: () => async () => true }));
vi.mock('@/components/adventure/play/fx/FoeTarget', () => ({ default: () => null }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('@/components/adventure/play/useAdventureBoardCoach', () => ({
  useAdventureBoardCoach: (args: { active: boolean; wordsFound: number }) => {
    coachArgs.last = args;
    return { coach: {}, onWordChange: vi.fn(), onSingleTapDetected: vi.fn(), markSubmit: vi.fn() };
  },
}));
vi.mock('@/components/game/ftue/StuckCoachOverlay', () => ({
  StuckCoachOverlay: () => <div data-testid="stuck-coach" />,
}));

import { AdventureDemo } from '../AdventureDemo';

describe('AdventureDemo stuck coach', () => {
  it('Given the free battle a first-time visitor plays, When it is running, Then the stuck coach watches it', () => {
    render(<AdventureDemo onExit={() => {}} />);
    expect(coachArgs.last).toMatchObject({ active: true, wordsFound: 0 });
    expect(screen.getByTestId('stuck-coach')).toBeInTheDocument();
  });
});
