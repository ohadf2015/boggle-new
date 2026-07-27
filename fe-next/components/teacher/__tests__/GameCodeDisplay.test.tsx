// @vitest-environment jsdom
/**
 * GameCodeDisplay Tests
 *
 * Tests for the enhanced game code display component
 * with QR code and projection mode features
 * Following TDD RED-GREEN-REFACTOR cycle
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameCodeDisplay from '../GameCodeDisplay';

// Mock hooks
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'teacher.game.qrCode': 'Show QR Code',
        'teacher.game.hideQrCode': 'Hide QR Code',
        'teacher.game.projectMode': 'Project on Screen',
        'teacher.game.exitProject': 'Exit Projection',
        'teacher.game.copyLink': 'Copy Link',
        'teacher.game.linkCopied': 'Game link copied!',
        'teacher.game.scanToJoin': 'Scan to join',
        'share.copy': 'Copy',
        'share.codeCopied': 'Code copied!',
      })[key] || key,
    language: 'en',
  }),
}));

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock QRCodeSVG from qrcode.react
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-code" data-value={value} />
  ),
}));

describe('GameCodeDisplay', () => {
  const defaultProps = {
    gameCode: 'ABC123',
    joinUrl: 'https://www.lexiclash.live/join/ABC123',
  };

  beforeEach(() => {
    mockWriteText.mockClear();
  });

  describe('rendering', () => {
    it('should display the game code prominently', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('should have a copy code button', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      // The copy code button has aria-label "Copy"
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      expect(copyButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('should not show QR code by default', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should copy game code to clipboard when copy button clicked', async () => {
      render(<GameCodeDisplay {...defaultProps} />);

      // Get the copy code button (has exact aria-label "Copy", not "Copy Link")
      const copyButtons = screen.getAllByRole('button');
      const copyCodeButton = copyButtons.find(
        (btn) => btn.getAttribute('aria-label') === 'Copy'
      );
      expect(copyCodeButton).toBeInTheDocument();
      fireEvent.click(copyCodeButton!);

      expect(mockWriteText).toHaveBeenCalledWith('ABC123');
    });
  });

  describe('QR code toggle', () => {
    it('should show QR code when QR button is clicked', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      const qrButton = screen.getByRole('button', { name: /qr code/i });
      fireEvent.click(qrButton);

      expect(screen.getByTestId('qr-code')).toBeInTheDocument();
    });

    it('should hide QR code when QR button is clicked again', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      const qrButton = screen.getByRole('button', { name: /qr code/i });
      fireEvent.click(qrButton); // Show
      fireEvent.click(qrButton); // Hide

      expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
    });

    it('should pass the join URL to QR code', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      const qrButton = screen.getByRole('button', { name: /qr code/i });
      fireEvent.click(qrButton);

      const qrCode = screen.getByTestId('qr-code');
      expect(qrCode).toHaveAttribute('data-value', 'https://www.lexiclash.live/join/ABC123');
    });
  });

  describe('projection mode', () => {
    it('should have a projection mode button', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      const projectButton = screen.getByRole('button', { name: /project/i });
      expect(projectButton).toBeInTheDocument();
    });

    it('should call onProjectionMode when projection button clicked', () => {
      const onProjectionMode = vi.fn();
      render(<GameCodeDisplay {...defaultProps} onProjectionMode={onProjectionMode} />);

      const projectButton = screen.getByRole('button', { name: /project/i });
      fireEvent.click(projectButton);

      expect(onProjectionMode).toHaveBeenCalled();
    });
  });

  describe('copy link functionality', () => {
    it('should have a copy link button', () => {
      render(<GameCodeDisplay {...defaultProps} />);

      const copyLinkButton = screen.getByRole('button', { name: /copy link/i });
      expect(copyLinkButton).toBeInTheDocument();
    });

    it('should copy join URL when copy link button clicked', async () => {
      render(<GameCodeDisplay {...defaultProps} />);

      const copyLinkButton = screen.getByRole('button', { name: /copy link/i });
      fireEvent.click(copyLinkButton);

      expect(mockWriteText).toHaveBeenCalledWith('https://www.lexiclash.live/join/ABC123');
    });
  });
});
