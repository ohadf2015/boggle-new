/**
 * BlastPhaserCanvas — browser-only Phaser canvas for Blast mode.
 *
 * Verifies:
 * - Renders container div with correct testid
 * - Creates Phaser.Game with BootScene + BlastScene
 * - Destroys game on unmount
 */

import React from 'react';
import Phaser from 'phaser';
import { render, act } from '@testing-library/react';

// Mock Phaser.Game to prevent actual canvas creation in Jest
jest.mock('phaser', () => {
  const mockGame = {
    canvas: { style: { direction: '' } },
    destroy: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      AUTO: 0,
      Scale: { RESIZE: 'RESIZE', CENTER_BOTH: 'CENTER_BOTH' },
      Game: jest.fn(() => mockGame),
    },
  };
});

jest.mock('@/phaser/config', () => ({
  createPhaserConfig: jest.fn((_parent: HTMLElement, scenes: unknown[]) => ({
    type: 0,
    scene: scenes,
  })),
}));

// Mock scene classes to avoid Phaser.Scene inheritance in test
jest.mock('@/phaser/scenes/BootScene', () => ({
  BootScene: jest.fn(),
}));
jest.mock('@/phaser/scenes/BlastScene', () => ({
  BlastScene: jest.fn(),
}));

// Must import after mocks
import BlastPhaserCanvas from '../BlastPhaserCanvas';
import { createPhaserConfig } from '@/phaser/config';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BlastPhaserCanvas', () => {
  it('renders a container div with data-testid', () => {
    const { getByTestId } = render(<BlastPhaserCanvas />);
    expect(getByTestId('blast-phaser-canvas-container')).toBeInTheDocument();
  });

  it('creates Phaser.Game with BootScene and BlastScene', () => {
    render(<BlastPhaserCanvas />);

    expect(createPhaserConfig).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.arrayContaining([
        expect.any(Function), // BootScene
        expect.any(Function), // BlastScene
      ]),
    );
    expect(Phaser.Game).toHaveBeenCalled();
  });

  it('sets canvas direction to ltr', () => {
    render(<BlastPhaserCanvas />);

    // The mock returns a game with canvas.style.direction
    const gameInstance = (Phaser.Game as jest.Mock).mock.results[0]?.value;
    expect(gameInstance.canvas.style.direction).toBe('ltr');
  });

  it('destroys game on unmount', () => {
    const { unmount } = render(<BlastPhaserCanvas />);
    const gameInstance = (Phaser.Game as jest.Mock).mock.results[0]?.value;

    act(() => unmount());

    expect(gameInstance.destroy).toHaveBeenCalledWith(true);
  });
});
