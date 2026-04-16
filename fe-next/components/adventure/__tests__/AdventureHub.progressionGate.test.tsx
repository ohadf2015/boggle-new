/**
 * H14 — Gate meta-progression features by milestones.
 * Verifies Runes and Word Album buttons in AdventureHub
 * respect prop-presence gating (undefined = hidden).
 */

import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr', language: 'en' }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('@/components/engagement/GhostRivalWidget', () => ({
  GhostRivalWidget: () => null,
}));

vi.mock('@/lib/adventure/adventureStreak', () => ({
  getStreakMultiplier: () => 1.0,
}));

vi.mock('@/lib/adventure/constants', () => ({
  getNextUnlockedLevel: () => ({ world: 1, level: 1 }),
}));

vi.mock('@/lib/adventure/levelConfig', () => ({
  getWorldConfig: () => ({ name: 'alphabetMeadows', levelCount: 7, mechanic: null }),
}));

vi.mock('@/lib/adventure/ascensionConfig', () => ({
  getAscensionLevel: () => null,
}));

import AdventureHub from '../AdventureHub';

const baseProps = {
  streakDays: 0,
  bestStreak: 0,
  dailyQuests: [],
  totalStars: 0,
  playerLevel: 1,
  gold: 0,
  completions: [],
  currentWorld: 5,
  onOpenWorldMap: vi.fn(),
  onPlayLevel: vi.fn(),
  onOpenShop: vi.fn(),
};

describe('AdventureHub progression gates (H14)', () => {
  describe('Runes button', () => {
    it('hidden when onOpenRunes is undefined', () => {
      render(<AdventureHub {...baseProps} />);
      expect(screen.queryByText('adventure.runes.title')).not.toBeInTheDocument();
    });

    it('visible when onOpenRunes callback provided', () => {
      render(<AdventureHub {...baseProps} onOpenRunes={vi.fn()} />);
      expect(screen.getByText('adventure.runes.title')).toBeInTheDocument();
    });
  });

  describe('Word Album button', () => {
    it('hidden when onOpenWordAlbum is undefined', () => {
      render(<AdventureHub {...baseProps} />);
      expect(screen.queryByText('adventure.hub.wordAlbum')).not.toBeInTheDocument();
    });

    it('visible when onOpenWordAlbum callback provided', () => {
      render(<AdventureHub {...baseProps} onOpenWordAlbum={vi.fn()} />);
      expect(screen.getByText('adventure.hub.wordAlbum')).toBeInTheDocument();
    });
  });

  describe('both features gated together', () => {
    it('neither visible without callbacks', () => {
      render(<AdventureHub {...baseProps} />);
      expect(screen.queryByText('adventure.runes.title')).not.toBeInTheDocument();
      expect(screen.queryByText('adventure.hub.wordAlbum')).not.toBeInTheDocument();
    });

    it('both visible with callbacks', () => {
      render(
        <AdventureHub
          {...baseProps}
          onOpenRunes={vi.fn()}
          onOpenWordAlbum={vi.fn()}
        />
      );
      expect(screen.getByText('adventure.runes.title')).toBeInTheDocument();
      expect(screen.getByText('adventure.hub.wordAlbum')).toBeInTheDocument();
    });
  });
});
