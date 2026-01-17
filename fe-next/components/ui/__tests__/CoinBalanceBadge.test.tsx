/**
 * Tests for CoinBalanceBadge Component
 *
 * Tests the compact coin balance display badge used next to
 * coin-spending buttons to show current balance and affordability.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { CoinBalanceBadge } from '../CoinBalanceBadge';

describe('CoinBalanceBadge', () => {
  describe('Rendering', () => {
    it('should render with balance', () => {
      render(<CoinBalanceBadge balance={100} />);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('should format large numbers with locale separators', () => {
      render(<CoinBalanceBadge balance={1500} />);
      expect(screen.getByText('1,500')).toBeInTheDocument();
    });

    it('should render zero balance', () => {
      render(<CoinBalanceBadge balance={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should have accessible role and label', () => {
      render(<CoinBalanceBadge balance={250} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Coin balance: 250');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CoinBalanceBadge balance={50} className="custom-position" />
      );
      expect(container.querySelector('.custom-position')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render xs size correctly', () => {
      const { container } = render(
        <CoinBalanceBadge balance={100} size="xs" />
      );
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('px-1');
      expect(badge).toHaveClass('text-[10px]');
    });

    it('should render sm size correctly (default)', () => {
      const { container } = render(
        <CoinBalanceBadge balance={100} size="sm" />
      );
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('px-1.5');
      expect(badge).toHaveClass('text-xs');
    });

    it('should render md size correctly', () => {
      const { container } = render(
        <CoinBalanceBadge balance={100} size="md" />
      );
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('text-sm');
    });

    it('should use sm size by default', () => {
      const { container } = render(<CoinBalanceBadge balance={100} />);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('px-1.5');
      expect(badge).toHaveClass('text-xs');
    });
  });

  describe('Affordability States', () => {
    it('should show green styling when canAfford is true', () => {
      const { container } = render(
        <CoinBalanceBadge balance={100} canAfford={true} />
      );
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-neo-lime');
      expect(badge).toHaveClass('text-neo-black');
    });

    it('should show red styling when canAfford is false', () => {
      const { container } = render(
        <CoinBalanceBadge balance={50} canAfford={false} />
      );
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-red-400');
      expect(badge).toHaveClass('text-white');
    });

    it('should default to canAfford true', () => {
      const { container } = render(<CoinBalanceBadge balance={100} />);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('bg-neo-lime');
    });
  });

  describe('Neo-Brutalist Styling', () => {
    it('should apply Neo-Brutalist base classes', () => {
      const { container } = render(<CoinBalanceBadge balance={100} />);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('rounded-full');
      expect(badge).toHaveClass('border-2');
      expect(badge).toHaveClass('border-neo-black');
      expect(badge).toHaveClass('shadow-hard-sm');
      expect(badge).toHaveClass('font-bold');
    });

    it('should use tabular-nums for consistent number display', () => {
      const { container } = render(<CoinBalanceBadge balance={100} />);
      const badge = container.querySelector('div');
      expect(badge).toHaveClass('tabular-nums');
    });
  });

  describe('Icon Rendering', () => {
    it('should render coin icon', () => {
      const { container } = render(<CoinBalanceBadge balance={100} />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should apply correct icon size for each size variant', () => {
      const { container: xsContainer } = render(
        <CoinBalanceBadge balance={100} size="xs" />
      );
      const xsIcon = xsContainer.querySelector('svg');
      expect(xsIcon).toHaveClass('w-2.5');
      expect(xsIcon).toHaveClass('h-2.5');

      const { container: smContainer } = render(
        <CoinBalanceBadge balance={100} size="sm" />
      );
      const smIcon = smContainer.querySelector('svg');
      expect(smIcon).toHaveClass('w-3');
      expect(smIcon).toHaveClass('h-3');

      const { container: mdContainer } = render(
        <CoinBalanceBadge balance={100} size="md" />
      );
      const mdIcon = mdContainer.querySelector('svg');
      expect(mdIcon).toHaveClass('w-3.5');
      expect(mdIcon).toHaveClass('h-3.5');
    });

    it('should change icon color based on canAfford state', () => {
      const { container: affordableContainer } = render(
        <CoinBalanceBadge balance={100} canAfford={true} />
      );
      const affordableIcon = affordableContainer.querySelector('svg');
      expect(affordableIcon).toHaveClass('text-neo-black');

      const { container: unaffordableContainer } = render(
        <CoinBalanceBadge balance={50} canAfford={false} />
      );
      const unaffordableIcon = unaffordableContainer.querySelector('svg');
      expect(unaffordableIcon).toHaveClass('text-white');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large balances', () => {
      render(<CoinBalanceBadge balance={999999} />);
      expect(screen.getByText('999,999')).toBeInTheDocument();
    });

    it('should handle negative balances (edge case)', () => {
      render(<CoinBalanceBadge balance={-50} />);
      expect(screen.getByText('-50')).toBeInTheDocument();
    });
  });
});
