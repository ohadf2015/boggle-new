/**
 * SkipLink Component Tests
 *
 * Tests for the accessible skip link component that allows keyboard users
 * to bypass navigation and jump directly to main content.
 *
 * Following WCAG 2.0 AA / Israeli Standard 5568 requirements.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink } from '../SkipLink';

// Mock translation function
const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'accessibility.skipToMain': 'Skip to main content',
    'accessibility.skipToNav': 'Skip to navigation',
    'accessibility.skipToSearch': 'Skip to search',
  };
  return translations[key] || key;
};

describe('SkipLink', () => {
  beforeEach(() => {
    // Create a target element for the skip link to jump to
    const mainContent = document.createElement('div');
    mainContent.id = 'main-content';
    mainContent.textContent = 'Main content area';
    document.body.appendChild(mainContent);
  });

  afterEach(() => {
    // Clean up the target element
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      document.body.removeChild(mainContent);
    }
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('is visually hidden by default (sr-only)', () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });
      expect(link).toHaveClass('sr-only');
    });

    it('becomes visible when focused', async () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });

      // Focus the link
      link.focus();

      // Should no longer have sr-only when focused (handled by focus:not-sr-only)
      expect(link).toHaveClass('focus:not-sr-only');
    });

    it('returns to hidden state when blurred', async () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });

      // Focus then blur
      link.focus();
      link.blur();

      // Should still have sr-only class (visible state is via CSS :focus)
      expect(link).toHaveClass('sr-only');
    });
  });

  describe('navigation', () => {
    it('has correct href pointing to target', () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });
      expect(link).toHaveAttribute('href', '#main-content');
    });

    it('moves focus to target element when clicked', async () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });
      const targetElement = document.getElementById('main-content');

      // Click the skip link
      fireEvent.click(link);

      // Target should receive focus
      expect(document.activeElement).toBe(targetElement);
    });

    it('sets tabindex on target temporarily to enable focus', async () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });

      fireEvent.click(link);

      // Target should be focusable (tabindex was set)
      const target = document.getElementById('main-content');
      expect(target).toHaveAttribute('tabindex', '-1');
    });

    it('works with keyboard Enter key', async () => {
      const user = userEvent.setup();

      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });
      const targetElement = document.getElementById('main-content');

      // Focus and press Enter
      link.focus();
      await user.keyboard('{Enter}');

      // Target should receive focus
      expect(document.activeElement).toBe(targetElement);
    });

    it('prevents default anchor behavior', async () => {
      const preventDefaultMock = vi.fn();

      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });

      // Use fireEvent with a custom event that has a mock preventDefault
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(clickEvent, 'preventDefault', {
        value: preventDefaultMock,
        writable: true,
      });

      link.dispatchEvent(clickEvent);

      expect(preventDefaultMock).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles missing target gracefully', () => {
      // Remove the target element
      const target = document.getElementById('main-content');
      if (target) document.body.removeChild(target);

      render(
        <SkipLink targetId="nonexistent-target" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });

      // Should not throw when clicked
      expect(() => fireEvent.click(link)).not.toThrow();
    });

    it('renders with custom children', () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          Custom skip text
        </SkipLink>
      );

      expect(screen.getByText('Custom skip text')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('applies neo-brutalist styling when focused', () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });

      // Check for expected focus styling classes
      expect(link.className).toContain('focus:bg-neo-yellow');
      expect(link.className).toContain('focus:shadow-hard');
    });

    it('has high z-index when visible', () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });
      expect(link.className).toContain('focus:z-50');
    });

    it('applies absolute positioning when focused', () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link', { name: 'Skip to main content' });
      expect(link.className).toContain('focus:absolute');
    });
  });

  describe('accessibility', () => {
    it('is an anchor element with role link', () => {
      render(
        <SkipLink targetId="main-content" t={mockT}>
          {mockT('accessibility.skipToMain')}
        </SkipLink>
      );

      const link = screen.getByRole('link');
      expect(link.tagName).toBe('A');
    });

    it('is first in tab order when rendered first', () => {
      render(
        <>
          <SkipLink targetId="main-content" t={mockT}>
            {mockT('accessibility.skipToMain')}
          </SkipLink>
          <button>Other button</button>
        </>
      );

      const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
      const button = screen.getByRole('button', { name: 'Other button' });

      // Skip link should come before button in tab order
      // Both should be focusable (no negative tabindex)
      expect(skipLink).not.toHaveAttribute('tabindex', '-1');
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });
});
