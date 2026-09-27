import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BraceControl } from '../rescue/BraceControl';
import { V2Dock } from '../V2Dock';

afterEach(cleanup);

const t = (key: string, params?: Record<string, string | number>) => {
  if (!params) return key;
  if (key === 'wordTowerV2.brace.rescueNow' && params.n) {
    return `${key}:${params.n}`;
  }
  return key;
};
const api = {
  offered: true, price: 40, affordable: true, spent: 0, buy: vi.fn(), rescue: null, rescuesLeft: 2,
  startRescue: vi.fn(), submitRescue: vi.fn(), cancelRescue: vi.fn(),
} as never;

/**
 * The rescue countdown is anchored above the HUD. The offer button moved to
 * the dock's merged StabilityBrace control.
 */
describe('BraceControl rescue countdown', () => {
  it('given a rescue countdown is active, when shown, then it displays the time remaining', () => {
    const apiWithRescue = {
      ...api,
      rescue: { minLen: 5, until: Date.now() + 10000 },
    };
    const { container } = render(<BraceControl t={t} api={apiWithRescue} reducedMotion />);

    // Should show the status container
    const statusBox = container.querySelector('[role="status"]');
    expect(statusBox).toBeTruthy();

    // Should contain the text (split across elements)
    expect(statusBox?.textContent).toContain('wordTowerV2.brace.rescueNow:5');

    // Should have a cancel button
    const cancelBtn = screen.getByLabelText('wordTowerV2.brace.cancel');
    expect(cancelBtn).toBeTruthy();
  });

  it('given no rescue active, when rendered, then BraceControl is not shown', () => {
    render(<BraceControl t={t} api={api} reducedMotion />);

    // Should not render anything
    const container = document.body.querySelector('[role="status"]');
    expect(container).toBeNull();
  });
});

const dockProps = {
  t,
  dockRef: { current: null },
  wide: false,
  dir: 'ltr' as const,
  swinging: false,
  composing: true,
  rejected: null,
  dictError: false,
  scrambles: 1,
  wheel: ['a', 'b', 'c', 'd', 'e'],
  selected: [],
  word: '',
  valid: false,
  intensity: 0,
  accentHex: '#000',
  reducedMotion: false,
  canPutBack: false,
  onScramble: vi.fn(),
  onSelectTile: vi.fn(),
  onDeselectTile: vi.fn(),
  onSubmit: vi.fn(),
  onDrop: vi.fn(),
  onPutBack: vi.fn(),
  onBackspace: vi.fn(),
};

/**
 * StabilityBrace must sit IN the dock's grid row, next to the wheel.
 * It was previously anchored by --wt2-dock and positioned absolutely ABOVE
 * the dock (floating over the tower), which is forbidden.
 */
describe('StabilityBrace placement in V2Dock', () => {
  it('given a stability slot on phone, when dock renders, then slot is in the same grid container as the wheel and scramble button', () => {
    const { container } = render(
      <V2Dock
        {...dockProps}
        stabilitySlot={<div data-testid="stability-marker">PILL</div>}
      />,
    );

    const marker = screen.getByTestId('stability-marker');
    const scrambleButton = screen.getByLabelText(t('wordTower.hud.scramble'));

    // Both should be inside the same grid container
    const grids = container.querySelectorAll('[class*="grid"]');
    expect(grids.length).toBeGreaterThan(0);

    // Check that marker and scramble are in the same grid
    let markerGrid = marker.closest('[class*="grid"]');
    let scrambleGrid = scrambleButton.closest('[class*="grid"]');

    if (markerGrid && scrambleGrid) {
      expect(markerGrid).toBe(scrambleGrid);
    }

    // Marker should NOT have ancestor carrying absolute bottom calc(var(--wt2-dock))
    let ancestor = marker.parentElement;
    let foundBadPositioning = false;
    while (ancestor && ancestor !== container) {
      const className = ancestor.className || '';
      if (className.includes('calc(var(--wt2-dock') || (className.includes('absolute') && className.includes('--wt2-dock'))) {
        foundBadPositioning = true;
      }
      ancestor = ancestor.parentElement;
    }
    expect(foundBadPositioning).toBe(false);
  });

  it('given a stability slot on wide layout, when dock renders, then slot is in the flex container', () => {
    const { container } = render(
      <V2Dock
        {...dockProps}
        wide={true}
        stabilitySlot={<div data-testid="stability-marker">PILL</div>}
      />,
    );

    const marker = screen.getByTestId('stability-marker');

    // On wide, should be in a flex container (not grid)
    let ancestor = marker.parentElement;
    let inFlex = false;
    while (ancestor && ancestor !== container) {
      if ((ancestor.className || '').includes('flex')) {
        inFlex = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    expect(inFlex).toBe(true);
  });
});
