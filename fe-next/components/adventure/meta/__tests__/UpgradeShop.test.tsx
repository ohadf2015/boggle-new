/**
 * Tests for UpgradeShop component
 *
 * Tests stat upgrade purchase UI with validation and feedback.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { UpgradeShop } from '../UpgradeShop';
import type { UpgradeId, PurchaseResult } from '../../../../shared/types/progression';
import '@testing-library/jest-dom';

// Mock translations
jest.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'adventure.upgrades.timeBonus': 'Time Bonus',
        'adventure.upgrades.scoreBonus': 'Score Bonus',
        'adventure.upgrades.xpBonus': 'XP Bonus',
        'adventure.upgrades.timeBonusDesc': '+10% time per level',
        'adventure.upgrades.scoreBonusDesc': '+5% score per level',
        'adventure.upgrades.xpBonusDesc': '+10% XP per level',
        'adventure.upgrades.purchase': 'Purchase',
        'adventure.upgrades.maxLevel': 'MAX',
        'adventure.upgrades.needMore': 'Need {amount} more gold',
        'adventure.upgrades.stack': '{current}/{max} stacks',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, whileTap, initial, animate, exit, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
    button: ({ children, whileHover, whileTap, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
}));

describe('UpgradeShop', () => {
  const mockOnPurchase = jest.fn();

  beforeEach(() => {
    mockOnPurchase.mockClear();
  });

  describe('Basic rendering', () => {
    it('should render all upgrade options', () => {
      // GIVEN: Upgrade shop with upgrades
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={1000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should display all three upgrades
      expect(screen.getByText('Time Bonus')).toBeInTheDocument();
      expect(screen.getByText('Score Bonus')).toBeInTheDocument();
      expect(screen.getByText('XP Bonus')).toBeInTheDocument();
    });

    it('should display upgrade descriptions', () => {
      // GIVEN: Upgrade shop
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={1000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should show descriptions
      expect(screen.getByText('+10% time per level')).toBeInTheDocument();
      expect(screen.getByText('+5% score per level')).toBeInTheDocument();
      expect(screen.getByText('+10% XP per level')).toBeInTheDocument();
    });

    it('should display current stack count', () => {
      // GIVEN: Some upgrades already purchased
      const upgrades = { timeBonus: 2, scoreBonus: 1, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={1000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should show stack counts
      expect(screen.getByText('2/5 stacks')).toBeInTheDocument();
      expect(screen.getByText('1/5 stacks')).toBeInTheDocument();
      expect(screen.getByText('0/5 stacks')).toBeInTheDocument();
    });

    it('should display upgrade costs', () => {
      // GIVEN: Upgrades with different costs
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={5000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should show costs (timeBonus: 500, scoreBonus: 750, xpBonus: 1000)
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('750')).toBeInTheDocument();
      expect(screen.getByText('1,000')).toBeInTheDocument();
    });
  });

  describe('Purchase button state', () => {
    it('should enable purchase button when affordable', () => {
      // GIVEN: Enough gold for timeBonus (costs 500)
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={1000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Time Bonus purchase button should be enabled
      const buttons = screen.getAllByText('Purchase');
      expect(buttons[0]).not.toBeDisabled();
    });

    it('should disable purchase button when not affordable', () => {
      // GIVEN: Not enough gold for any upgrade
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={400}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: All purchase buttons should be disabled
      const buttons = screen.getAllByText('Purchase');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should show "Need more gold" message when insufficient', () => {
      // GIVEN: Not enough gold (need 100 more for timeBonus)
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={400}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should show how much more gold is needed
      expect(screen.getByText(/Need.*100.*more gold/)).toBeInTheDocument();
    });

    it('should show MAX badge when at max stacks', () => {
      // GIVEN: Max stacks of timeBonus
      const upgrades = { timeBonus: 5, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={10000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should show MAX badge instead of purchase button
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });
  });

  describe('Purchase interaction', () => {
    it('should call onPurchase with correct upgradeId', () => {
      // GIVEN: Affordable upgrade
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };
      mockOnPurchase.mockReturnValue({ success: true, newGold: 500, newStacks: 1 });

      // WHEN: Clicking purchase button for timeBonus
      render(
        <UpgradeShop
          gold={1000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      const buttons = screen.getAllByText('Purchase');
      fireEvent.click(buttons[0]); // First button is timeBonus

      // THEN: Should call onPurchase with timeBonus
      expect(mockOnPurchase).toHaveBeenCalledWith('timeBonus');
    });

    it('should handle purchase success', () => {
      // GIVEN: Successful purchase
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };
      mockOnPurchase.mockReturnValue({ success: true, newGold: 500, newStacks: 1 });

      // WHEN: Purchasing upgrade
      const { rerender } = render(
        <UpgradeShop
          gold={1000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      const buttons = screen.getAllByText('Purchase');
      fireEvent.click(buttons[0]);

      // THEN: Should call onPurchase
      expect(mockOnPurchase).toHaveBeenCalled();
    });

    it('should not call onPurchase when button is disabled', () => {
      // GIVEN: Insufficient gold (button disabled)
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Attempting to click disabled button
      render(
        <UpgradeShop
          gold={400}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      const buttons = screen.getAllByText('Purchase');
      fireEvent.click(buttons[0]); // Button is disabled, so click is ignored

      // THEN: Should not call onPurchase when disabled
      expect(mockOnPurchase).not.toHaveBeenCalled();
    });
  });

  describe('Cost calculation', () => {
    it('should show increased cost for subsequent purchases', () => {
      // GIVEN: One stack already purchased (next costs 750)
      const upgrades = { timeBonus: 1, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      const { container } = render(
        <UpgradeShop
          gold={2000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should show increased cost for timeBonus (first card)
      const upgradeCards = container.querySelectorAll('[data-testid="upgrade-card"]');
      const timeBonusCard = upgradeCards[0]; // timeBonus is first
      expect(timeBonusCard.textContent).toContain('750'); // Stack 2 costs 750
    });

    it('should show different costs for different upgrades', () => {
      // GIVEN: Different upgrade types
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      render(
        <UpgradeShop
          gold={5000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should show different base costs
      expect(screen.getByText('500')).toBeInTheDocument(); // timeBonus
      expect(screen.getByText('750')).toBeInTheDocument(); // scoreBonus
      expect(screen.getByText('1,000')).toBeInTheDocument(); // xpBonus
    });
  });

  describe('Neo-brutalist styling', () => {
    it('should apply neo-brutalist styles', () => {
      // GIVEN: Upgrade shop
      const upgrades = { timeBonus: 0, scoreBonus: 0, xpBonus: 0 };

      // WHEN: Rendering component
      const { container } = render(
        <UpgradeShop
          gold={1000}
          upgrades={upgrades}
          onPurchase={mockOnPurchase}
        />
      );

      // THEN: Should have neo-brutalist classes
      const upgradeCards = container.querySelectorAll('[data-testid="upgrade-card"]');
      expect(upgradeCards.length).toBeGreaterThan(0);
      expect(upgradeCards[0]).toHaveClass('border-black');
      expect(upgradeCards[0]).toHaveClass('shadow-hard');
    });
  });
});
