import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) => (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren<object>) => <>{children}</>,
}));

import { AchievementProgressTracker } from '../AchievementProgressTracker';

const baseProps = {
  validWordCount: 1,
  comboLevel: 0,
  maxCombo: 0,
  wordLengths: [4],
  timeSinceStart: 10,
  gameDuration: 120,
  earnedAchievements: [],
};

describe('AchievementProgressTracker - mindblown mascot', () => {
  it('shows mindblown mascot when an achievement is >= 80% complete', () => {
    // WORDSMITH: target=50, shows when validWordCount>=25
    // validWordCount=40 => 40/50 = 80% => hits MINDBLOWN_PROGRESS_THRESHOLD
    render(<AchievementProgressTracker {...baseProps} validWordCount={40} />);
    expect(screen.getByTestId('mascot-mindblown')).toBeInTheDocument();
  });

  it('does not show mindblown when no achievement is close to 80%', () => {
    // validWordCount=1 => nothing qualifies (all thresholds require 25+)
    render(<AchievementProgressTracker {...baseProps} validWordCount={1} />);
    expect(screen.queryByTestId('mascot-mindblown')).not.toBeInTheDocument();
  });
});
