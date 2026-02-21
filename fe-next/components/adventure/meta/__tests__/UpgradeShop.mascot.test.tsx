/**
 * UpgradeShop - Shopkeeper Mascot Tests
 *
 * Verifies that Lexi appears as the friendly shopkeeper in the upgrade shop header.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Mascot before importing component
jest.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
}));

// Mock translations
jest.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
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

import { UpgradeShop } from '../UpgradeShop';
import type { PurchaseResult } from '../../../../shared/types/progression';

describe('UpgradeShop - shopkeeper mascot', () => {
  const defaultProps = {
    gold: 1000,
    upgrades: { timeBonus: 0, scoreBonus: 0, xpBonus: 0 },
    onPurchase: jest.fn((): PurchaseResult => ({ success: true, newGold: 500, newStacks: 1 })),
  };

  it('renders shopkeeper mascot in shop header', () => {
    // GIVEN: Upgrade shop with default props
    // WHEN: Rendering the component
    render(<UpgradeShop {...defaultProps} />);

    // THEN: Shopkeeper mascot should be present
    expect(screen.getByTestId('mascot-shopkeeper')).toBeInTheDocument();
  });
});
