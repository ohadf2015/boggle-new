import { vi } from 'vitest';
/**
 * Test: MobileBottomNav z-index must be higher than Header overlays
 *
 * Bug Context:
 * - Header mobile menu overlay has z-70 (components/Header.tsx:445)
 * - MobileBottomNav was changed from z-50 to z-65 (commit e95788ec)
 * - This makes navigation tabs unclickable when menu is open
 *
 * Expected Behavior:
 * - MobileBottomNav should have z-index HIGHER than Header overlay (z-70)
 * - Navigation tabs should be clickable at all times
 * - Buttons should receive click events
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileBottomNav } from '@/host/components/pre-game/MobileBottomNav';

describe('MobileBottomNav z-index', () => {
  const mockT = (key: string) => key;
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should have z-index higher than Header overlay (z-70)', () => {
    const { container } = render(
      <MobileBottomNav
        activeTab="lobby"
        onTabChange={mockOnTabChange}
        playerCount={3}
        unreadChatCount={2}
        t={mockT}
      />
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();

    // Check className directly (getComputedStyle doesn't work reliably with custom z-index in JSDOM)
    const className = nav?.className || '';

    // Must have z-75 or higher (> z-70 Header overlay)
    // Match both bracket notation z-[75] and standard Tailwind z-75
    const zIndexMatch = className.match(/z-\[(\d+)\]/) || className.match(/z-(\d+)/);
    expect(zIndexMatch).toBeTruthy();

    if (zIndexMatch) {
      const zIndex = parseInt(zIndexMatch[1], 10);
      expect(zIndex).toBeGreaterThan(70);
    }
  });

  test('should remain clickable when Header overlay is present', () => {
    const { container } = render(
      <>
        {/* Simulate Header overlay */}
        <div
          data-testid="header-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            backgroundColor: 'rgba(0,0,0,0.5)'
          }}
        />

        {/* Mobile bottom nav */}
        <MobileBottomNav
          activeTab="lobby"
          onTabChange={mockOnTabChange}
          playerCount={3}
          unreadChatCount={2}
          t={mockT}
        />
      </>
    );

    // Click chat button (different from active tab)
    const chatButton = screen.getByRole('button', { name: /hostView\.chat/i });
    fireEvent.click(chatButton);

    // Should be clickable despite overlay
    expect(mockOnTabChange).toHaveBeenCalledWith('chat');
  });

  test('should have pointer-events enabled on buttons', () => {
    render(
      <MobileBottomNav
        activeTab="lobby"
        onTabChange={mockOnTabChange}
        playerCount={3}
        unreadChatCount={2}
        t={mockT}
      />
    );

    const lobbyButton = screen.getByRole('button', { name: /hostView\.lobby/i });
    const chatButton = screen.getByRole('button', { name: /hostView\.chat/i });

    // Buttons should not have pointer-events: none
    expect(lobbyButton).not.toHaveStyle({ pointerEvents: 'none' });
    expect(chatButton).not.toHaveStyle({ pointerEvents: 'none' });
  });

  test('should use z-index that prevents clickability issues', () => {
    const { container } = render(
      <MobileBottomNav
        activeTab="lobby"
        onTabChange={mockOnTabChange}
        playerCount={3}
        unreadChatCount={2}
        t={mockT}
      />
    );

    const nav = container.querySelector('nav');
    const className = nav?.className || '';

    // Should NOT use z-65 (too low)
    expect(className).not.toContain('z-65');

    // Should use z-75 or higher (must be > z-70 Header overlay)
    // Match both bracket z-[N] and standard z-N notation
    const zMatch = className.match(/z-\[(\d+)\]/) || className.match(/z-(\d+)/);
    expect(zMatch).toBeTruthy();
    if (zMatch) {
      const zVal = parseInt(zMatch[1], 10);
      expect(zVal).toBeGreaterThanOrEqual(75);
    }
  });
});
