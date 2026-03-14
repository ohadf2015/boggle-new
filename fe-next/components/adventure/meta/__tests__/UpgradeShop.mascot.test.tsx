/**
 * UpgradeShop - Shopkeeper Mascot Tests
 *
 * Verifies that Lexi appears as the friendly shopkeeper in the upgrade shop header.
 */

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

jest.mock('../../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

import { UpgradeShop } from '../UpgradeShop';

describe('UpgradeShop - shopkeeper mascot', () => {
  const defaultProps = {
    gold: 1000,
    upgrades: {},
    currentWorld: 1,
    onPurchase: jest.fn(),
  };

  it('renders shopkeeper mascot in shop header', () => {
    render(<UpgradeShop {...defaultProps} />);
    expect(screen.getByTestId('mascot-shopkeeper')).toBeInTheDocument();
  });
});
