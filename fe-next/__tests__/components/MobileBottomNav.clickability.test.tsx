/**
 * @file Test for mobile bottom nav clickability z-index fix
 * @description
 * Bug: Mobile bottom tabs were not clickable because drawer and overlays blocked them
 * Root cause: MobileDrawer z-[60] and TvTutorialOverlay z-[100] blocked MobileBottomNav z-50
 * Fix: Increase MobileBottomNav z-index to z-[65] (above drawer z-[60], below tutorial z-[100])
 */

import { render, screen } from '@testing-library/react';
import { MobileBottomNav } from '@/host/components/pre-game/MobileBottomNav';

describe('MobileBottomNav Clickability', () => {
  const mockT = (key: string) => key;
  const mockOnTabChange = jest.fn();

  const defaultProps = {
    activeTab: 'lobby' as const,
    onTabChange: mockOnTabChange,
    playerCount: 5,
    unreadChatCount: 2,
    t: mockT,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have z-index higher than MobileDrawer (z-[60]) to remain clickable', () => {
    // GIVEN: MobileBottomNav is rendered
    const { container } = render(<MobileBottomNav {...defaultProps} />);
    const nav = container.querySelector('nav');

    // WHEN: We check the z-index class
    // THEN: It should be z-[65] or higher (above drawer z-[60])
    expect(nav?.className).toMatch(/z-\[(6[5-9]|[7-9]\d|\d{3,})\]/); // z-[65] or higher
  });

  it('should have z-index lower than TvTutorialOverlay (z-[100]) for tutorial visibility', () => {
    // GIVEN: MobileBottomNav is rendered
    const { container } = render(<MobileBottomNav {...defaultProps} />);
    const nav = container.querySelector('nav');

    // WHEN: We extract the z-index value
    const zIndexMatch = nav?.className.match(/z-\[(\d+)\]/);
    const zIndexValue = zIndexMatch ? parseInt(zIndexMatch[1], 10) : 0;

    // THEN: It should be less than 100 (below tutorial overlay)
    expect(zIndexValue).toBeLessThan(100);
    expect(zIndexValue).toBeGreaterThanOrEqual(65);
  });

  it('should render lobby and chat tabs', () => {
    // GIVEN: MobileBottomNav is rendered
    render(<MobileBottomNav {...defaultProps} />);

    // WHEN: We check for tab elements
    // THEN: Both tabs should be present
    expect(screen.getByText('hostView.lobby')).toBeInTheDocument();
    expect(screen.getByText('hostView.chat')).toBeInTheDocument();
  });
});
