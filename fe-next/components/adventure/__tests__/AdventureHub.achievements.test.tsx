/**
 * S6-1 — Achievement button visibility in AdventureHub.
 * Follows same prop-presence gating pattern as Runes/WordAlbum.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
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
  currentWorld: 1,
  onOpenWorldMap: vi.fn(),
  onPlayLevel: vi.fn(),
  onOpenShop: vi.fn(),
};

describe('AdventureHub achievement button (S6-1)', () => {
  it('hidden when onOpenAchievements is undefined', () => {
    render(<AdventureHub {...baseProps} />);
    expect(screen.queryByText('adventure.achievements.title')).not.toBeInTheDocument();
  });

  it('visible when onOpenAchievements callback provided', () => {
    render(<AdventureHub {...baseProps} onOpenAchievements={vi.fn()} />);
    expect(screen.getByText('adventure.achievements.title')).toBeInTheDocument();
  });

  it('calls onOpenAchievements when clicked', async () => {
    const onOpen = vi.fn();
    render(<AdventureHub {...baseProps} onOpenAchievements={onOpen} />);
    await userEvent.click(screen.getByText('adventure.achievements.title'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
