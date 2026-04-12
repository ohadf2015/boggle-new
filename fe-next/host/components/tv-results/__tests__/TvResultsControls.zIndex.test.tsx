import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import TvResultsControls from '../TvResultsControls';

/**
 * Test: TV Results Controls Z-Index Visibility
 *
 * Root Cause: Controls bar with buttons was hidden behind footer
 * because the z-index was too low (z-[55]) compared to footer (z-10).
 * While 55 > 10, stacking context issues with parent container caused overlap.
 *
 * Expected Behavior: Controls should have z-index high enough to be
 * above footer and all other page content.
 */
describe('TvResultsControls - Z-Index Visibility', () => {
  const mockT = (key: string) => key;
  const defaultProps = {
    visible: true,
    isAnimating: false,
    isTournament: false,
    isLastRound: true,
    playersReadyCount: 2,
    totalPlayers: 5,
    onSkip: vi.fn(),
    onStartNewGame: vi.fn(),
    onNextRound: vi.fn(),
    onShowQR: vi.fn(),
    t: mockT,
  };

  it('should have z-index higher than footer (z-10)', () => {
    // GIVEN: TV results controls are rendered
    const { container } = render(<TvResultsControls {...defaultProps} />);

    // WHEN: Checking the controls bar z-index
    const controlsBar = container.querySelector('[class*="fixed"][class*="bottom-0"]');

    // THEN: Controls bar should exist
    expect(controlsBar).toBeInTheDocument();

    // THEN: Controls should have z-index >= 70 to be above footer (z-10)
    // and above TvResultsView container (z-60)
    const zIndexClass = controlsBar?.className.match(/z-\[(\d+)\]/)?.[1];
    expect(zIndexClass).toBeDefined();
    expect(parseInt(zIndexClass || '0', 10)).toBeGreaterThanOrEqual(70);
  });

  it('should render buttons when visible', () => {
    // GIVEN: Controls are visible
    const { getByText } = render(<TvResultsControls {...defaultProps} />);

    // WHEN: Looking for action buttons
    // THEN: Should find Start New Game button
    expect(getByText(/tvResults\.startNewGame/)).toBeInTheDocument();

    // THEN: Should find QR Code button
    expect(getByText('tvResults.qrCode')).toBeInTheDocument();
  });

  it('should render Next Round button in tournament mode', () => {
    // GIVEN: Tournament mode with more rounds
    const props = {
      ...defaultProps,
      isTournament: true,
      isLastRound: false,
    };
    const { getByText } = render(<TvResultsControls {...props} />);

    // WHEN: Looking for tournament controls
    // THEN: Should find Next Round button instead of Start New Game
    expect(getByText(/tvResults\.nextRound/)).toBeInTheDocument();
  });

  it('should render Skip button during animation', () => {
    // GIVEN: Controls are animating
    const props = {
      ...defaultProps,
      isAnimating: true,
    };
    const { getByText } = render(<TvResultsControls {...props} />);

    // WHEN: Looking for skip control
    // THEN: Should find Skip button
    expect(getByText('tvResults.skip')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    // GIVEN: Controls are not visible
    const props = {
      ...defaultProps,
      visible: false,
    };
    const { container } = render(<TvResultsControls {...props} />);

    // WHEN: Checking for controls bar
    const controlsBar = container.querySelector('[class*="fixed"][class*="bottom-0"]');

    // THEN: Controls should not be rendered
    expect(controlsBar).not.toBeInTheDocument();
  });
});
