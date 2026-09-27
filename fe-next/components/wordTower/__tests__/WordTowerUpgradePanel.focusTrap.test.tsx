/**
 * WCAG 2.1.2: the upgrade panel is role="dialog" aria-modal="true" but had no
 * keyboard focus containment — Tab escaped to the page behind it and Escape did
 * nothing. It must trap focus and close on Escape (via the shared useFocusTrap).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WordTowerUpgradePanel } from '../WordTowerUpgradePanel';

vi.mock('@/utils/coinManager', () => ({ getCoins: () => 9999 }));
vi.mock('@/lib/wordTower/useTowerUpgradeStore', () => ({
  useTowerUpgradeStore: (selector: (s: { levels: Record<string, number>; buy: () => boolean }) => unknown) =>
    selector({ levels: {}, buy: () => false }),
}));

const t = (key: string) => key;

describe('WordTowerUpgradePanel — focus trap (WCAG 2.1.2)', () => {
  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<WordTowerUpgradePanel onClose={onClose} t={t} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps Tab — pressing Tab on the last focusable wraps to the first', () => {
    const onClose = vi.fn();
    render(<WordTowerUpgradePanel onClose={onClose} t={t} />);

    const buttons = screen.getAllByRole('button');
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    expect(buttons.length).toBeGreaterThan(1);

    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(document, { key: 'Tab' });

    expect(document.activeElement).toBe(first);
  });
});
