/**
 * Tests for AdventureLevelUpModal Component
 *
 * Tests level up celebration modal including:
 * - Modal rendering when open
 * - Level number display
 * - Confetti effect triggering
 * - Auto-close behavior
 * - Reduced motion support
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AdventureLevelUpModal from '../AdventureLevelUpModal';
import * as confettiUtils from '@/utils/confettiUtils';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
  }),
}));

// Mock confetti utils
vi.mock('@/utils/confettiUtils', () => ({
  fireLevelUpConfetti: vi.fn(),
}));

// Mock matchMedia globally
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false, // Default to no reduced motion
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('AdventureLevelUpModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Modal Open/Close', () => {
    it('should render when isOpen is true', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <AdventureLevelUpModal
          isOpen={false}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call onClose when clicking backdrop', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      const backdrop = screen.getByRole('dialog');
      await user.click(backdrop);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when escape key is pressed', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Level Display', () => {
    it('should display the correct level number', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={10}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should display level up text', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      // Using translation key since we're mocked
      expect(screen.getByText(/levelUp/i)).toBeInTheDocument();
    });
  });

  describe('Confetti Effect', () => {
    it('should fire confetti when modal opens', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      expect(confettiUtils.fireLevelUpConfetti).toHaveBeenCalledTimes(1);
    });

    it('should not fire confetti when modal is not open', () => {
      render(
        <AdventureLevelUpModal
          isOpen={false}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      expect(confettiUtils.fireLevelUpConfetti).not.toHaveBeenCalled();
    });

    it('should fire confetti only once per open', () => {
      const { rerender } = render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      expect(confettiUtils.fireLevelUpConfetti).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      // Should still be 1 (not called again)
      expect(confettiUtils.fireLevelUpConfetti).toHaveBeenCalledTimes(1);
    });
  });

  describe('Auto-Close', () => {
    it('should auto-close after 3 seconds', async () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      expect(mockOnClose).not.toHaveBeenCalled();

      // Fast-forward time by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should not auto-close before 3 seconds', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      // Fast-forward time by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Reduced Motion', () => {
    beforeEach(() => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });

    it('should not fire confetti when reduced motion is preferred', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      // Component should skip confetti when reduced motion is enabled
      expect(confettiUtils.fireLevelUpConfetti).not.toHaveBeenCalled();
    });

    afterEach(() => {
      // Reset matchMedia to default (no reduced motion)
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-modal attribute', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby linking to title', () => {
      render(
        <AdventureLevelUpModal
          isOpen={true}
          newLevel={5}
          onClose={mockOnClose}
        />
      );

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      // Title element should exist with that ID
      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).toBeInTheDocument();
    });
  });
});
