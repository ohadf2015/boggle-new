import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastChestBadge } from '../BlastChestBadge';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe('BlastChestBadge', () => {
  it('renders chest number and progress', () => {
    const contents = {
      tier: 'gold' as const,
      coins: 800,
      boosts: [{ type: 'shield', count: 1 }],
      avatarPart: null,
      frameSkin: 'gold',
    };

    render(
      <BlastChestBadge chestNumber={1} progress={0.4} contents={contents} onPreview={() => {}} />
    );

    expect(screen.getByTestId('chest-badge').getAttribute('aria-label')).toMatch(/Chest #1/i);
    expect(screen.getByText(/40%/i)).toBeDefined();
  });

  it('keeps the contents summary out of the collapsed badge (aria-label only)', () => {
    const contents = {
      tier: 'wood' as const,
      coins: 250,
      boosts: [],
      avatarPart: null,
      frameSkin: 'wood',
    };

    render(
      <BlastChestBadge chestNumber={1} progress={0} contents={contents} onPreview={() => {}} />
    );

    // The +N coins row would make the badge tower over the level box in
    // band 1 — contents live in the tap-to-open preview modal instead.
    expect(screen.queryByText(/\+250 coins/i)).toBeNull();
    expect(screen.getByTestId('chest-badge').getAttribute('aria-label')).toMatch(/\+250 coins/i);
  });

  it('announces boosts in the aria-label', () => {
    const contents = {
      tier: 'silver' as const,
      coins: 400,
      boosts: [{ type: 'speed', count: 1 }],
      avatarPart: null,
      frameSkin: 'silver',
    };

    render(
      <BlastChestBadge chestNumber={2} progress={0.5} contents={contents} onPreview={() => {}} />
    );

    expect(screen.queryByText(/\+1 boost/i)).toBeNull();
    expect(screen.getByTestId('chest-badge').getAttribute('aria-label')).toMatch(/\+1 boost/i);
  });

  it('announces avatar parts in the aria-label', () => {
    const contents = {
      tier: 'legendary' as const,
      coins: 2000,
      boosts: [{ type: 'shield', count: 1 }],
      avatarPart: 'head_1',
      frameSkin: 'legendary',
    };

    render(
      <BlastChestBadge chestNumber={3} progress={1} contents={contents} onPreview={() => {}} />
    );

    expect(screen.queryByText(/\+1 avatar part/i)).toBeNull();
    expect(screen.getByTestId('chest-badge').getAttribute('aria-label')).toMatch(/\+1 avatar part/i);
  });
});
