import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// Must mock before importing component
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
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
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
  streakDays: 5,
  bestStreak: 10,
  dailyQuests: [],
  totalStars: 20,
  playerLevel: 5,
  gold: 500,
  completions: [],
  currentWorld: 1,
  onOpenWorldMap: vi.fn(),
  onPlayLevel: vi.fn(),
  onOpenShop: vi.fn(),
};

describe('Collection gallery button in AdventureHub', () => {
  it('renders collection button when onOpenCollection is provided', () => {
    const onOpenCollection = vi.fn();
    render(
      <AdventureHub {...baseProps} onOpenCollection={onOpenCollection} collectionCount={12} />
    );
    const btn = screen.getByTestId('hub-open-collection');
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain('adventure.collection.title');
  });

  it('calls onOpenCollection when button is clicked', () => {
    const onOpenCollection = vi.fn();
    render(
      <AdventureHub {...baseProps} onOpenCollection={onOpenCollection} collectionCount={3} />
    );
    fireEvent.click(screen.getByTestId('hub-open-collection'));
    expect(onOpenCollection).toHaveBeenCalledTimes(1);
  });

  it('shows collection count badge when count > 0', () => {
    render(
      <AdventureHub {...baseProps} onOpenCollection={vi.fn()} collectionCount={7} />
    );
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('does not render collection button when onOpenCollection is not provided', () => {
    render(<AdventureHub {...baseProps} />);
    expect(screen.queryByTestId('hub-open-collection')).not.toBeInTheDocument();
  });
});
