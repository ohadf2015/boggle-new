import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const played = vi.hoisted(() => ({ value: false }));
vi.mock('@/utils/dailyChallenge/storage', () => ({ hasEverPlayedWordHunt: () => played.value }));
vi.mock('@/components/daily/DailyChallengeTutorial', () => ({
  DailyChallengeTutorial: ({ onComplete, onSkip, source }: { onComplete: () => void; onSkip: () => void; source: string }) => (
    <div data-testid="lesson" data-source={source}>
      <button type="button" onClick={onComplete}>play</button>
      <button type="button" onClick={onSkip}>skip</button>
    </div>
  ),
}));

import { QuickHuntLessonGate } from '../QuickHuntLessonGate';

const round = () => <QuickHuntLessonGate language="en"><div data-testid="round">round</div></QuickHuntLessonGate>;

beforeEach(() => {
  window.localStorage.clear();
  played.value = false;
});

describe('QuickHuntLessonGate', () => {
  it('given a player new to Word Hunt, then the lesson runs before the round mounts, and Play starts the round', () => {
    render(round());
    expect(screen.getByTestId('lesson').dataset.source).toBe('quick_play');
    expect(screen.queryByTestId('round')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('play'));
    expect(screen.getByTestId('round')).toBeInTheDocument();
  });

  it('given Skip, then the round starts', () => {
    render(round());
    fireEvent.click(screen.getByText('skip'));
    expect(screen.getByTestId('round')).toBeInTheDocument();
  });

  it('given the lesson was already shown once (daily or quick play), then the round starts straight away', () => {
    const first = render(round());
    first.unmount();
    render(round());
    expect(screen.queryByTestId('lesson')).not.toBeInTheDocument();
    expect(screen.getByTestId('round')).toBeInTheDocument();
  });

  it('given a player who has played the daily Word Hunt, then there is no lesson', () => {
    played.value = true;
    render(round());
    expect(screen.getByTestId('round')).toBeInTheDocument();
  });
});
