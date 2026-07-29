import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CollectionPanel, { type InventoryItem } from '../CollectionPanel';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockInventory: InventoryItem[] = [
  { item_id: 'boss-trophy-w1', item_type: 'bossTrophy', category: 'trophy', rarity: 'epic', quantity: 1, source_world: 1, source_level: 7, earned_at: '2026-03-28T00:00:00Z' },
  { item_id: 'lore-scroll-w1-l1', item_type: 'loreScroll', category: 'scroll', rarity: 'common', quantity: 1, source_world: 1, source_level: 1, earned_at: '2026-03-28T00:00:00Z' },
  { item_id: 'rune-fragment', item_type: 'runeFragment', category: 'rune', rarity: 'rare', quantity: 5, source_world: null, source_level: null, earned_at: '2026-03-28T00:00:00Z' },
  { item_id: 'cosmic-shard', item_type: 'cosmicShard', category: 'relic', rarity: 'legendary', quantity: 1, source_world: 10, source_level: 7, earned_at: '2026-03-28T00:00:00Z' },
];

describe('CollectionPanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    inventory: mockInventory,
  };

  it('renders when open', () => {
    render(<CollectionPanel {...defaultProps} />);
    expect(screen.getByTestId('collection-panel')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CollectionPanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('collection-panel')).not.toBeInTheDocument();
  });

  it('shows total collection count', () => {
    render(<CollectionPanel {...defaultProps} />);
    expect(screen.getByText(/4\//)).toBeInTheDocument();
  });

  it('shows category tabs', () => {
    render(<CollectionPanel {...defaultProps} />);
    expect(screen.getByTestId('collection-tab-trophy')).toBeInTheDocument();
    expect(screen.getByTestId('collection-tab-scroll')).toBeInTheDocument();
    expect(screen.getByTestId('collection-tab-rune')).toBeInTheDocument();
    expect(screen.getByTestId('collection-tab-relic')).toBeInTheDocument();
  });

  it('switches categories on tab click', () => {
    render(<CollectionPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId('collection-tab-relic'));
    // Relic items should now show (cosmic-shard is owned)
    expect(screen.getByTestId('collection-item-cosmic-shard')).toBeInTheDocument();
  });

  it('shows owned items without lock icon', () => {
    render(<CollectionPanel {...defaultProps} />);
    const ownedItem = screen.getByTestId('collection-item-boss-trophy-w1');
    expect(ownedItem).toBeInTheDocument();
    // Should show the trophy emoji, not '???'
    expect(ownedItem.textContent).not.toContain('???');
  });

  it('shows locked items with ??? name', () => {
    render(<CollectionPanel {...defaultProps} />);
    // boss-trophy-w2 is not in inventory, should show ???
    const lockedItem = screen.getByTestId('collection-item-boss-trophy-w2');
    expect(lockedItem.textContent).toContain('???');
  });

  it('shows quantity for stackable items', () => {
    render(<CollectionPanel {...defaultProps} />);
    fireEvent.click(screen.getByTestId('collection-tab-rune'));
    const runeItem = screen.getByTestId('collection-item-rune-fragment');
    expect(runeItem.textContent).toContain('×5');
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<CollectionPanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('collection-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows rarity legend', () => {
    render(<CollectionPanel {...defaultProps} />);
    expect(screen.getByText('adventure.collection.rarity.common')).toBeInTheDocument();
    expect(screen.getByText('adventure.collection.rarity.legendary')).toBeInTheDocument();
  });
});
