/**
 * LootRevealAnimation Tests
 *
 * Tests the staggered loot reveal animation for level completion rewards.
 */

import React from 'react';
import { vi, describe, it, expect } from 'vitest';
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

  it('renders a prominent rune-fragment callout when runeFragment drops are present', () => {
    const drops = [
      { type: 'gold', rarity: 'common', label: 'Gold' },
      { type: 'runeFragment', rarity: 'rare', quantity: 2 },
    ];
    render(<LootRevealAnimation drops={drops} />);

    const callout = screen.getByTestId('loot-rune-fragment-callout');
    expect(callout).toBeInTheDocument();
    // Highlights total fragments earned this level
    expect(callout.textContent).toContain('2');
    // Uses the dedicated translation key (mocked to identity)
    expect(callout.textContent).toContain('adventure.runes.fragmentEarned');
  });

  it('omits the rune-fragment callout when no fragments dropped', () => {
    render(<LootRevealAnimation drops={sampleDrops} />);
    expect(screen.queryByTestId('loot-rune-fragment-callout')).toBeNull();
  });
});
