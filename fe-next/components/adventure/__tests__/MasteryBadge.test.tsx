/**
 * MasteryBadge Component Tests
 *
 * Tests mastery tier badge rendering for WorldMap nodes (tiers 0-5)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MasteryBadge } from '../MasteryBadge';
import type { MasteryTier } from '@/types/adventure';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  m: { div: ({ children, ...p }: any) => <div {...p}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
  },
}));

describe('MasteryBadge', () => {
  it('renders nothing for tier 0', () => {
    const { container } = render(<MasteryBadge tier={0} />);
    expect(container.firstChild).toBeNull();
  });

  it.each([
    [1, 'adventure.mastery.tier.bronze'],
    [2, 'adventure.mastery.tier.silver'],
    [3, 'adventure.mastery.tier.gold'],
    [4, 'adventure.mastery.tier.platinum'],
    [5, 'adventure.mastery.tier.diamond'],
  ] as [MasteryTier, string][])(
    'shows correct tier name for tier %i',
    (tier, expectedKey) => {
      render(<MasteryBadge tier={tier} />);
      expect(screen.getByText(expectedKey)).toBeInTheDocument();
    }
  );

  it.each([1, 2, 3, 4, 5] as MasteryTier[])(
    'shows %i filled pips for tier %i',
    (tier) => {
      const { container } = render(<MasteryBadge tier={tier} />);
      const filledPips = container.querySelectorAll('[data-pip="filled"]');
      const emptyPips = container.querySelectorAll('[data-pip="empty"]');
      expect(filledPips).toHaveLength(tier);
      expect(emptyPips).toHaveLength(5 - tier);
    }
  );

  it.each([
    [1, 'adventure.mastery.tier.bronze'],
    [2, 'adventure.mastery.tier.silver'],
    [3, 'adventure.mastery.tier.gold'],
    [4, 'adventure.mastery.tier.platinum'],
    [5, 'adventure.mastery.tier.diamond'],
  ] as [MasteryTier, string][])(
    'has correct ARIA label for tier %i',
    (tier, tierKey) => {
      render(<MasteryBadge tier={tier} />);
      const badge = screen.getByRole('img', { hidden: true });
      expect(badge).toHaveAttribute(
        'aria-label',
        expect.stringContaining(`adventure.mastery.label`)
      );
    }
  );

  it.each([
    [1, 'text-amber-600'],
    [2, 'text-gray-300'],
    [3, 'text-yellow-400'],
    [4, 'text-gray-100'],
    [5, 'text-cyan-200'],
  ] as [MasteryTier, string][])(
    'uses correct color class for tier %i',
    (tier, expectedClass) => {
      render(<MasteryBadge tier={tier} />);
      const badge = screen.getByRole('img', { hidden: true });
      expect(badge.className).toContain(expectedClass);
    }
  );
});
