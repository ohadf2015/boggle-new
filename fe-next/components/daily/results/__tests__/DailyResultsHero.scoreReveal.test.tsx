import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DailyResultsHero } from '../DailyResultsHero';
import { LanguageProvider } from '@/contexts/LanguageContext';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('@/components/Avatar', () => ({ default: ({ mood }: { mood?: string }) => <div data-testid="avatar" data-mood={mood} /> }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/en/daily/word-hunt',
  useSearchParams: () => new URLSearchParams(),
}));

const playedStatus = {
  today: { wordHunt: true, wordWheel: true, wordTower: false, connections: false },
  streak: { current: 4, longest: 9 },
  allCompletedDates: [],
  freezeCount: 0,
  loading: false,
  fromServer: true,
  freezeApplied: undefined,
  refresh: vi.fn(),
};
vi.mock('@/hooks/useDailyPlayedStatus', () => ({ useDailyPlayedStatus: () => playedStatus }));
const fx = vi.hoisted(() => ({ reduced: false }));
vi.mock('@/hooks/useReducedEffects', () => ({ useReducedEffects: () => [fx.reduced, vi.fn()] }));

function renderHero(props: Partial<React.ComponentProps<typeof DailyResultsHero>> = {}) {
  return render(
    <LanguageProvider initialLanguage="en">
      <DailyResultsHero mode="word-hunt" outcome="win" headline="Solved!" score={420} {...props} />
    </LanguageProvider>,
  );
}

describe('DailyResultsHero score reveal', () => {
  beforeEach(() => {
    fx.reduced = false;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: false, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => vi.useRealTimers());

  it('Given a fresh finish, Then the score never sits on screen at 0: it stays hidden until its beat, then shows', () => {
    vi.useFakeTimers();
    renderHero({ celebrate: true });
    const score = screen.getByTestId('daily-results-score');
    expect(score.className).toContain('invisible');

    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByTestId('daily-results-score').className).not.toContain('invisible');
  });

  it('Given the player turned effects down in game, Then the final score shows at once', () => {
    fx.reduced = true;
    vi.useFakeTimers();
    renderHero({ celebrate: true });
    const score = screen.getByTestId('daily-results-score');
    expect(score).toHaveTextContent('420');
    expect(score.className).not.toContain('invisible');
  });
});
