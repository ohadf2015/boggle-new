/**
 * KeyboardDesktopBadge Component Tests
 *
 * Tests for the desktop keyboard indicator badge component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { KeyboardDesktopBadge } from '../KeyboardDesktopBadge';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'keyboardDesktopBadge.typeWords': 'Type words',
    'keyboardDesktopBadge.pressQuestion': 'Press ? for shortcuts',
  };
  return translations[key] || key;
};

describe('KeyboardDesktopBadge', () => {
  // Save original navigator
  const originalNavigator = window.navigator;

  beforeEach(() => {
    // Reset userAgent mock before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  describe('desktop detection', () => {
    it('renders on desktop devices', () => {
      // Mock desktop userAgent
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });

      render(<KeyboardDesktopBadge t={mockT} />);

      expect(screen.getByText('Type words')).toBeInTheDocument();
      expect(screen.getByText('Press ? for shortcuts')).toBeInTheDocument();
    });

    it('does not render on iPhone', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
        writable: true,
      });

      const { container } = render(<KeyboardDesktopBadge t={mockT} />);

      expect(container.firstChild).toBeNull();
    });

    it('does not render on iPad', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)' },
        writable: true,
      });

      const { container } = render(<KeyboardDesktopBadge t={mockT} />);

      expect(container.firstChild).toBeNull();
    });

    it('does not render on Android devices', () => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G960U)' },
        writable: true,
      });

      const { container } = render(<KeyboardDesktopBadge t={mockT} />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('positioning', () => {
    beforeEach(() => {
      // Set desktop userAgent
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });
    });

    it('applies bottom-right position by default', () => {
      const { container } = render(<KeyboardDesktopBadge t={mockT} />);

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bottom-4');
      expect(badge.className).toContain('right-4');
    });

    it('applies bottom-left position when specified', () => {
      const { container } = render(
        <KeyboardDesktopBadge t={mockT} position="bottom-left" />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('bottom-4');
      expect(badge.className).toContain('left-4');
    });

    it('applies top-right position when specified', () => {
      const { container } = render(
        <KeyboardDesktopBadge t={mockT} position="top-right" />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('top-4');
      expect(badge.className).toContain('right-4');
    });

    it('applies top-left position when specified', () => {
      const { container } = render(
        <KeyboardDesktopBadge t={mockT} position="top-left" />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('top-4');
      expect(badge.className).toContain('left-4');
    });
  });

  describe('accessibility', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });
    });

    it('has role="status" for accessibility', () => {
      render(<KeyboardDesktopBadge t={mockT} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label for screen readers', () => {
      render(<KeyboardDesktopBadge t={mockT} />);

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-label', 'Type words');
    });
  });

  describe('styling', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });
    });

    it('applies neo-brutalist styling', () => {
      const { container } = render(<KeyboardDesktopBadge t={mockT} />);

      const innerDiv = container.querySelector('.border-neo-black');
      expect(innerDiv).toBeInTheDocument();
    });

    it('applies custom className when provided', () => {
      const { container } = render(
        <KeyboardDesktopBadge t={mockT} className="custom-class" />
      );

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('custom-class');
    });

    it('has pointer-events-none to not interfere with interactions', () => {
      const { container } = render(<KeyboardDesktopBadge t={mockT} />);

      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('pointer-events-none');
    });
  });

  describe('content', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'navigator', {
        value: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        writable: true,
      });
    });

    it('displays translation content', () => {
      render(<KeyboardDesktopBadge t={mockT} />);

      expect(screen.getByText('Type words')).toBeInTheDocument();
      expect(screen.getByText('Press ? for shortcuts')).toBeInTheDocument();
    });

    it('renders keyboard icon', () => {
      const { container } = render(<KeyboardDesktopBadge t={mockT} />);

      // lucide-react icons render as SVGs
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
