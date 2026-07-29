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
  // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
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
  onOpenWorldMap: vi.fn(),
  onPlayLevel: vi.fn(),
  onOpenShop: vi.fn(),
};

describe('Endless Mode unlock gate (EN-H2)', () => {
  it('does NOT show endless mode button when currentWorld < 3', () => {
    render(<AdventureHub {...baseProps} currentWorld={2} />);
    expect(screen.queryByText('adventure.endlessMode.title')).not.toBeInTheDocument();
  });

  it('shows endless mode button when currentWorld is 3', () => {
    render(<AdventureHub {...baseProps} currentWorld={3} />);
    expect(screen.getByText('adventure.endlessMode.title')).toBeInTheDocument();
  });

  it('shows endless mode button when currentWorld > 3', () => {
    render(<AdventureHub {...baseProps} currentWorld={7} />);
    expect(screen.getByText('adventure.endlessMode.title')).toBeInTheDocument();
  });

  it('endless mode link points to /adventure/endless', () => {
    render(<AdventureHub {...baseProps} currentWorld={3} />);
    const link = screen.getByText('adventure.endlessMode.title').closest('a');
    expect(link).toHaveAttribute('href', '/adventure/endless');
  });
});
