import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => (
    <div ref={ref} {...Object.fromEntries(Object.entries(props).filter(([k]) => !['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout', 'layoutId', 'variants'].includes(k)))}>{children}</div>
  ));
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    m: { div: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

import { SurvivalLootPanel, type SurvivalLootPanelProps } from '../SurvivalLootPanel';
import type { WordDiscovery } from '../types';

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'wordHunt.desktop.lootCollected': 'Loot Collected',
    'wordHunt.desktop.noWordsYet': 'Find words to collect loot!',
    'wordHunt.desktop.powerUps': 'Power-ups',
    'wordHunt.desktop.hintsUnlocked': 'Hints Unlocked',
    'wordHunt.desktop.triesRemaining': 'Tries Remaining',
    'wordHunt.survival.accumulatedScore': 'Score',
  };
  return translations[key] || key;
};

const baseProps: SurvivalLootPanelProps = {
  discoveredWords: [],
  hintStage: 0,
  attempts: [],
  t: mockT,
};

describe('SurvivalLootPanel', () => {
  it('shows empty state when no words discovered', () => {
    render(<SurvivalLootPanel {...baseProps} />);
    expect(screen.getByText('Find words to collect loot!')).toBeInTheDocument();
  });

  it('renders discovered words', () => {
    const words: WordDiscovery[] = [
      { word: 'HELLO', timestamp: Date.now(), lifeGained: 5, tokensGained: 2 },
      { word: 'WORLD', timestamp: Date.now() - 1000, lifeGained: 3, tokensGained: 1 },
    ];
    render(<SurvivalLootPanel {...baseProps} discoveredWords={words} />);
    expect(screen.getByText('HELLO')).toBeInTheDocument();
    expect(screen.getByText('WORLD')).toBeInTheDocument();
  });

  it('shows word count in header', () => {
    const words: WordDiscovery[] = [
      { word: 'TEST', timestamp: Date.now(), lifeGained: 5, tokensGained: 2 },
      { word: 'CODE', timestamp: Date.now() - 1000, lifeGained: 3, tokensGained: 1 },
      { word: 'PLAY', timestamp: Date.now() - 2000, lifeGained: 4, tokensGained: 1 },
    ];
    render(<SurvivalLootPanel {...baseProps} discoveredWords={words} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows hints unlocked count', () => {
    render(<SurvivalLootPanel {...baseProps} hintStage={2} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows tries remaining', () => {
    // MAX_ATTEMPTS is 10, so 2 target attempts = 8 remaining
    const attempts = [
      { word: 'WRONG', feedback: [], timestamp: Date.now() },
      { word: 'ALSO', feedback: [], timestamp: Date.now() },
    ];
    render(<SurvivalLootPanel {...baseProps} attempts={attempts} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders loot collected header', () => {
    render(<SurvivalLootPanel {...baseProps} />);
    expect(screen.getByText('Loot Collected')).toBeInTheDocument();
  });

  it('uses icons instead of emojis for life and token rewards', () => {
    const words: WordDiscovery[] = [
      { word: 'HELLO', timestamp: Date.now(), lifeGained: 5, tokensGained: 2 },
    ];
    const { container } = render(<SurvivalLootPanel {...baseProps} discoveredWords={words} />);

    // Should NOT contain emoji characters
    const textContent = container.textContent || '';
    expect(textContent).not.toContain('❤️');
    expect(textContent).not.toContain('🔑');

    // Should contain the numeric values with icons (rendered as SVG by Lucide)
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('shows star icon for long words (7+ letters)', () => {
    const words: WordDiscovery[] = [
      { word: 'SURVIVAL', timestamp: Date.now(), lifeGained: 12, tokensGained: 3 },
    ];
    render(<SurvivalLootPanel {...baseProps} discoveredWords={words} />);
    expect(screen.getByText('SURVIVAL')).toBeInTheDocument();
    // Word should be styled as pink for 7+ letter words
    expect(screen.getByText('SURVIVAL')).toHaveClass('text-neo-pink');
  });
});
