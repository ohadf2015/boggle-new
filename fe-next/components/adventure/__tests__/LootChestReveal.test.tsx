import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LootChestReveal from '../LootChestReveal';
import type { LootDrop } from '@/types/adventure';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

jest.mock('next/image', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockImage(props: any, ref: any) {
      const { fill, priority, ...rest } = props;
      return React.createElement('img', { ...rest, ref });
    }),
  };
});

jest.mock('framer-motion', () => {
  const React = require('react');
  const MockComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const { initial, animate, exit, transition, variants, whileHover, whileTap, onAnimationComplete, ...rest } = props;
    return React.createElement('div', { ...rest, ref }, children);
  });
  MockComponent.displayName = 'MockComponent';
  return {
    motion: { div: MockComponent, button: MockComponent },
    AnimatePresence: ({ children }: any) => children,
  };
});

const STAGGER_MS = 500;

const mockDrops: LootDrop[] = [
  { type: 'gold', quantity: 80, rarity: 'common' },
  { type: 'runeFragment', quantity: 1, rarity: 'rare' },
  { type: 'loreScroll', quantity: 1, rarity: 'common' },
];

describe('LootChestReveal', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LootChestReveal isOpen={false} drops={mockDrops} onComplete={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders chest when isOpen is true', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} />);
    expect(screen.getByTestId('loot-chest')).toBeInTheDocument();
  });

  it('shows tap-to-open prompt initially', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} />);
    expect(screen.getByText('adventure.loot.tapToOpen')).toBeInTheDocument();
  });

  it('opens chest on click and reveals drops with stagger', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    // First drop appears after first stagger
    act(() => { jest.advanceTimersByTime(STAGGER_MS); });
    expect(screen.getByTestId('loot-drop-gold')).toBeInTheDocument();
  });

  it('shows continue button after all drops revealed', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    for (let i = 0; i < mockDrops.length; i++) {
      act(() => { jest.advanceTimersByTime(STAGGER_MS); });
    }
    expect(screen.getByTestId('loot-continue')).toBeInTheDocument();
  });

  it('calls onComplete when continue is clicked', () => {
    const onComplete = jest.fn();
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    for (let i = 0; i < mockDrops.length; i++) {
      act(() => { jest.advanceTimersByTime(STAGGER_MS); });
    }
    fireEvent.click(screen.getByTestId('loot-continue'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not render for empty drops', () => {
    const { container } = render(
      <LootChestReveal isOpen={true} drops={[]} onComplete={jest.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders correct chest image for each tier', () => {
    const { rerender } = render(
      <LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} chestTier="wooden" />
    );
    expect(screen.getByAltText('adventure.loot.chest')).toHaveAttribute(
      'src', '/images/adventure/loot/chest-wooden-closed.webp'
    );

    rerender(
      <LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} chestTier="golden" />
    );
    expect(screen.getByAltText('adventure.loot.chest')).toHaveAttribute(
      'src', '/images/adventure/loot/chest-golden-closed.webp'
    );
  });

  it('switches to open chest image after click', () => {
    render(
      <LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} chestTier="silver" />
    );
    fireEvent.click(screen.getByTestId('loot-chest'));
    expect(screen.getByAltText('adventure.loot.chest')).toHaveAttribute(
      'src', '/images/adventure/loot/chest-silver-open.webp'
    );
  });

  it('renders loot drop images instead of emojis', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    act(() => { jest.advanceTimersByTime(STAGGER_MS); });
    const goldImg = screen.getByAltText('adventure.loot.gold');
    expect(goldImg).toHaveAttribute('src', '/images/adventure/loot/loot-gold-coins.webp');
  });
});
