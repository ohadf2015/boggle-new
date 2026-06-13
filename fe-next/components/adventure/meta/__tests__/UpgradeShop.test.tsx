/**
 * UpgradeShop — Word Forge Tests
 *
 * Tests the new category-based upgrade shop with tiered upgrades.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/components/ui/Mascot', () => ({
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

vi.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, layout, initial, animate, exit, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover, whileTap, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  m: {
    div: ({ children, layout, initial, animate, exit, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover, whileTap, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

import { UpgradeShop } from '../UpgradeShop';

describe('UpgradeShop', () => {
  const defaultProps = {
    gold: 500,
    upgrades: {},
    currentWorld: 1,
    onPurchase: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    it('should show gold balance', () => {
      render(<UpgradeShop {...defaultProps} />);
      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('should show upgrade cards for world 1 upgrades', () => {
      render(<UpgradeShop {...defaultProps} />);
      const cards = screen.getAllByTestId('upgrade-card');
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });

    it('should show category tabs', () => {
      render(<UpgradeShop {...defaultProps} currentWorld={5} />);
      expect(screen.getByTestId('category-excavation')).toBeInTheDocument();
      expect(screen.getByTestId('category-survival')).toBeInTheDocument();
      expect(screen.getByTestId('category-fortune')).toBeInTheDocument();
    });

    it('should show mastery category when world >= 5', () => {
      render(<UpgradeShop {...defaultProps} currentWorld={5} />);
      expect(screen.getByTestId('category-mastery')).toBeInTheDocument();
    });

    it('should show ALL four category tabs even at world 1 (locked ones are teasers)', () => {
      render(<UpgradeShop {...defaultProps} currentWorld={1} />);
      expect(screen.getByTestId('category-excavation')).toBeInTheDocument();
      expect(screen.getByTestId('category-survival')).toBeInTheDocument();
      expect(screen.getByTestId('category-fortune')).toBeInTheDocument();
      // Mastery upgrades unlock later but the tab is shown so players see what's coming.
      expect(screen.getByTestId('category-mastery')).toBeInTheDocument();
    });
  });

  describe('locked upgrade teasers', () => {
    it('renders locked upgrades (above current world) as teaser cards', () => {
      // Excavation at world 1: wordRadar(unlockWorld 1) + deepDrill/gemDetector(unlockWorld 3).
      render(<UpgradeShop {...defaultProps} currentWorld={1} />);
      const cards = screen.getAllByTestId('upgrade-card');
      // All three excavation upgrades render, not just the unlocked one.
      expect(cards.length).toBe(3);
    });

    it('shows an "unlocks at world" label on locked teasers', () => {
      render(<UpgradeShop {...defaultProps} currentWorld={1} />);
      expect(screen.getAllByText('adventure.upgrades.unlocksAtWorld').length).toBeGreaterThanOrEqual(1);
    });

    it('does not render a purchase button on locked teasers', () => {
      // Only wordRadar is buyable at world 1 (gold 500 covers its 60 cost).
      render(<UpgradeShop {...defaultProps} currentWorld={1} gold={500} />);
      expect(screen.getAllByText('adventure.upgrades.purchase').length).toBe(1);
    });

    it('marks locked teaser cards via data-testid', () => {
      render(<UpgradeShop {...defaultProps} currentWorld={1} />);
      expect(screen.getAllByTestId('upgrade-card-locked').length).toBe(2);
    });
  });

  describe('tier display', () => {
    it('should show 0/N for unpurchased upgrades', () => {
      render(<UpgradeShop {...defaultProps} />);
      expect(screen.getByText('0/5')).toBeInTheDocument();
    });

    it('should show current tier for purchased upgrades', () => {
      render(<UpgradeShop {...defaultProps} upgrades={{ wordRadar: 3 }} />);
      expect(screen.getByText('3/5')).toBeInTheDocument();
    });
  });

  describe('purchasing', () => {
    it('should call onPurchase with new state when buying', () => {
      render(<UpgradeShop {...defaultProps} gold={100} />);
      const purchaseButtons = screen.getAllByText('adventure.upgrades.purchase');
      fireEvent.click(purchaseButtons[0]);
      expect(defaultProps.onPurchase).toHaveBeenCalledWith(
        'wordRadar',
        { wordRadar: 1 },
        40
      );
    });

    it('should disable purchase button when insufficient gold', () => {
      render(<UpgradeShop {...defaultProps} gold={10} />);
      const buttons = screen.getAllByRole('button');
      const disabledBtns = buttons.filter(b => (b as HTMLButtonElement).disabled);
      expect(disabledBtns.length).toBeGreaterThan(0);
    });

    it('should show max level badge when upgrade is maxed', () => {
      render(<UpgradeShop {...defaultProps} upgrades={{ wordRadar: 5 }} />);
      expect(screen.getByText('adventure.upgrades.maxLevel')).toBeInTheDocument();
    });
  });

  describe('category switching', () => {
    it('should switch displayed upgrades when clicking category tab', () => {
      render(<UpgradeShop {...defaultProps} currentWorld={5} />);
      fireEvent.click(screen.getByTestId('category-survival'));
      expect(screen.getByText('adventure.upgrades.fuelTank.name')).toBeInTheDocument();
    });
  });
});
