import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LootChestReveal from '../LootChestReveal';
import type { LootDrop } from '@/types/adventure';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('next/image', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockImage(props: any, ref: any) {
      const { fill, priority, ...rest } = props;
      return React.createElement('img', { ...rest, ref });
    }),
  };
});

vi.mock('framer-motion', () => {
  const React = require('react');
  const MockComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const { initial, animate, exit, transition, variants, whileHover, whileTap, onAnimationComplete, ...rest } = props;
    return React.createElement('div', { ...rest, ref }, children);
  });
  MockComponent.displayName = 'MockComponent';
  return {
    m: { div: MockComponent, button: MockComponent },
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
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <LootChestReveal isOpen={false} drops={mockDrops} onComplete={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders chest when isOpen is true', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} />);
    expect(screen.getByTestId('loot-chest')).toBeInTheDocument();
  });

  it('shows tap-to-open prompt initially', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} />);
    expect(screen.getByText('adventure.loot.tapToOpen')).toBeInTheDocument();
  });

  it('opens chest on click and reveals drops with stagger', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    // First drop appears after first stagger
    act(() => { vi.advanceTimersByTime(STAGGER_MS); });
    expect(screen.getByTestId('loot-drop-gold')).toBeInTheDocument();
  });

  it('shows continue button after all drops revealed', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    for (let i = 0; i < mockDrops.length; i++) {
      act(() => { vi.advanceTimersByTime(STAGGER_MS); });
    }
    expect(screen.getByTestId('loot-continue')).toBeInTheDocument();
  });

  it('calls onComplete when continue is clicked', () => {
    const onComplete = vi.fn();
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    for (let i = 0; i < mockDrops.length; i++) {
      act(() => { vi.advanceTimersByTime(STAGGER_MS); });
    }
    fireEvent.click(screen.getByTestId('loot-continue'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not render for empty drops', () => {
    const { container } = render(
      <LootChestReveal isOpen={true} drops={[]} onComplete={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders correct chest image for each tier', () => {
    const { rerender } = render(
      <LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} chestTier="wooden" />
    );
    expect(screen.getByAltText('adventure.loot.chest')).toHaveAttribute(
      'src', '/images/adventure/loot/chest-wooden-closed.webp'
    );

    rerender(
      <LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} chestTier="golden" />
    );
    expect(screen.getByAltText('adventure.loot.chest')).toHaveAttribute(
      'src', '/images/adventure/loot/chest-golden-closed.webp'
    );
  });

  it('switches to open chest image after click', () => {
    render(
      <LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} chestTier="silver" />
    );
    fireEvent.click(screen.getByTestId('loot-chest'));
    expect(screen.getByAltText('adventure.loot.chest')).toHaveAttribute(
      'src', '/images/adventure/loot/chest-silver-open.webp'
    );
  });

  it('renders loot drop images instead of emojis', () => {
    render(<LootChestReveal isOpen={true} drops={mockDrops} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByTestId('loot-chest'));

    act(() => { vi.advanceTimersByTime(STAGGER_MS); });
    const goldImg = screen.getByAltText('adventure.loot.gold');
    expect(goldImg).toHaveAttribute('src', '/images/adventure/loot/loot-gold-coins.webp');
  });

  describe('F12 — fast reveal + total', () => {
    const fourDrops: LootDrop[] = [
      { type: 'gold', quantity: 80, rarity: 'common' },
      { type: 'bonusGold', quantity: 40, rarity: 'rare' },
      { type: 'xp', quantity: 25, rarity: 'common' },
      { type: 'runeFragment', quantity: 1, rarity: 'rare' },
    ];

    // Audit F12 contract: with N drops, total reveal must finish within 1500ms.
    // Each timer-tick advance must be ≥ STAGGER_MS (real value in source) to flush
    // the chained setTimeout + React state update between drops.
    const TICK_BUDGET_MS = (n: number) => Math.ceil(1500 / n);

    it('reveals all drops within 1500ms (audit F12 target)', () => {
      render(<LootChestReveal isOpen={true} drops={fourDrops} onComplete={vi.fn()} />);
      fireEvent.click(screen.getByTestId('loot-chest'));
      const tick = TICK_BUDGET_MS(fourDrops.length);
      for (let i = 0; i < fourDrops.length; i++) {
        act(() => { vi.advanceTimersByTime(tick); });
      }
      expect(screen.getByTestId('loot-continue')).toBeInTheDocument();
    });

    it('shows total gold sum bold when all drops revealed', () => {
      render(<LootChestReveal isOpen={true} drops={fourDrops} onComplete={vi.fn()} />);
      fireEvent.click(screen.getByTestId('loot-chest'));
      const tick = TICK_BUDGET_MS(fourDrops.length);
      for (let i = 0; i < fourDrops.length; i++) {
        act(() => { vi.advanceTimersByTime(tick); });
      }
      // 80 (gold) + 40 (bonusGold) = 120
      expect(screen.getByTestId('loot-total-gold')).toHaveTextContent('120');
    });

    it('omits total gold display when no gold drops are present', () => {
      const noGoldDrops: LootDrop[] = [
        { type: 'xp', quantity: 25, rarity: 'common' },
        { type: 'runeFragment', quantity: 1, rarity: 'rare' },
      ];
      render(<LootChestReveal isOpen={true} drops={noGoldDrops} onComplete={vi.fn()} />);
      fireEvent.click(screen.getByTestId('loot-chest'));
      const tick = TICK_BUDGET_MS(noGoldDrops.length);
      for (let i = 0; i < noGoldDrops.length; i++) {
        act(() => { vi.advanceTimersByTime(tick); });
      }
      expect(screen.queryByTestId('loot-total-gold')).not.toBeInTheDocument();
    });
  });
});
