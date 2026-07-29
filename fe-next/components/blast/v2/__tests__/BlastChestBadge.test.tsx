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

    expect(screen.getByText(/Chest #1/i)).toBeDefined();
    expect(screen.getByText(/40%/i)).toBeDefined();
  });

  it('displays coins in contents summary', () => {
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

    expect(screen.getByText(/\+250 coins/i)).toBeDefined();
  });

  it('displays boosts if present', () => {
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

    expect(screen.getByText(/\+1 boost/i)).toBeDefined();
  });

  it('displays avatar part if present', () => {
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

    expect(screen.getByText(/\+1 avatar part/i)).toBeDefined();
  });
});
