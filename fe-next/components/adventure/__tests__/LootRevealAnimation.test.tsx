/**
 * LootRevealAnimation Tests
 *
 * Tests the staggered loot reveal animation for level completion rewards.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { LootRevealAnimation } from '../LootRevealAnimation';

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

const sampleDrops = [
  { type: 'gold', rarity: 'common', label: 'Gold Coins' },
  { type: 'xp', rarity: 'rare', label: 'XP Star' },
];

describe('LootRevealAnimation', () => {
  it('renders nothing when drops is empty', () => {
    const { container } = render(<LootRevealAnimation drops={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders loot items', () => {
    render(<LootRevealAnimation drops={sampleDrops} />);
    expect(screen.getAllByTestId('loot-item')).toHaveLength(2);
  });

  it('renders the loot container', () => {
    render(<LootRevealAnimation drops={sampleDrops} />);
    expect(screen.getByTestId('loot-reveal-container')).toBeInTheDocument();
  });

  it('renders item labels', () => {
    render(<LootRevealAnimation drops={sampleDrops} />);
    expect(screen.getByText('Gold Coins')).toBeInTheDocument();
    expect(screen.getByText('XP Star')).toBeInTheDocument();
  });

  it('applies different styles for legendary rarity', () => {
    const legendaryDrop = [{ type: 'bossTrophy', rarity: 'legendary', label: 'Boss Trophy' }];
    render(<LootRevealAnimation drops={legendaryDrop} />);
    const item = screen.getByTestId('loot-item');
    expect(item.className).toMatch(/neo-yellow/);
  });

  it('applies different styles for rare rarity', () => {
    const rareDrop = [{ type: 'xp', rarity: 'rare', label: 'XP' }];
    render(<LootRevealAnimation drops={rareDrop} />);
    const item = screen.getByTestId('loot-item');
    expect(item.className).toMatch(/neo-purple/);
  });

  it('applies different styles for common rarity', () => {
    const commonDrop = [{ type: 'gold', rarity: 'common', label: 'Gold' }];
    render(<LootRevealAnimation drops={commonDrop} />);
    const item = screen.getByTestId('loot-item');
    expect(item.className).toMatch(/neo-cyan/);
  });
});
