/**
 * PlayerArchetypeBadge Tooltip Position Tests
 *
 * Tests that tooltip arrow correctly points at the badge element
 * in both LTR and RTL modes, especially when tooltip is clamped.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock LanguageContext for RTL testing
const mockLanguageContext = {
  t: (key: string) => key,
  language: 'he',
  setLanguage: vi.fn(),
  dir: 'rtl',
};

vi.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => mockLanguageContext,
}));

vi.mock('../../../contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playComboSound: vi.fn(),
    playErrorSound: vi.fn(),
    setGameActive: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt} {...props} />
    );
  },
}));

// Mock createPortal to render inline for testing
vi.mock('react-dom', () => {
  const originalModule = vi.importActual('react-dom');
  return {
    ...originalModule,
    createPortal: (node: React.ReactNode) => node,
  };
});

import PlayerArchetypeBadge from '../PlayerArchetypeBadge';
import type { PlayerArchetype } from '@/utils/playerArchetypes';

const mockArchetype: PlayerArchetype = {
  id: 'strategist',
  name: 'Strategist',
  description: 'A thoughtful player who plans their moves',
  emoji: '🧠',
  icon: '/archetypes/strategist.png',
  color: 'text-cyan-600',
  bgColor: 'bg-cyan-100',
};

describe('PlayerArchetypeBadge Tooltip Position', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 400, // Small viewport to test edge positioning
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('positions tooltip arrow pointing at the badge when badge is near right edge in RTL', async () => {
    // Badge positioned near right edge of viewport (RTL start)
    // rect.left = 300, rect.width = 80, so center = 340
    // Tooltip width = 256, so tooltip.left would need to be 340 - 128 = 212
    // But minLeft = 128 + 16 = 144, maxLeft = 400 - 128 - 16 = 256
    // So tooltip center is clamped to 256 (badge center is at 340)
    // Arrow should still point at 340, not at 256 (tooltip center)

    const mockBadgeRect = {
      left: 300,
      right: 380,
      top: 100,
      bottom: 140,
      width: 80,
      height: 40,
      x: 300,
      y: 100,
      toJSON: () => ({}),
    };

    Element.prototype.getBoundingClientRect = vi.fn(() => mockBadgeRect);

    render(<PlayerArchetypeBadge archetype={mockArchetype} animate={false} />);

    // The badge displays the archetype name since t() returns the key (translation missing fallback)
    const badge = screen.getByText('Strategist');
    fireEvent.mouseEnter(badge.closest('div')!);

    await waitFor(() => {
      // Look for the tooltip content - uses description fallback since translation returns key
      expect(screen.getByText('A thoughtful player who plans their moves')).toBeInTheDocument();
    });

    // Find the arrow element - it's a div with rotate-45 class
    const tooltipContainer = screen.getByText('A thoughtful player who plans their moves').closest('.fixed');
    expect(tooltipContainer).toBeInTheDocument();

    const arrow = tooltipContainer?.querySelector('.rotate-45');
    expect(arrow).toBeInTheDocument();

    // The arrow should be positioned to point at the badge center (340px)
    // relative to the tooltip's left position (256px after clamping)
    // Arrow position = badge center - tooltip left = 340 - (256 - 128) = 340 - 128 = 212px?
    // Actually: tooltip.left with transform -translate-x-1/2 means:
    // tooltip visual left = tooltipPosition.left - tooltipWidth/2 = 256 - 128 = 128px
    // badge center = 340px
    // arrow offset from tooltip left = 340 - 128 = 212px
    // As percentage of tooltip (256px): 212/256 = 82.8%

    // The fix: arrow position is now dynamic via inline style
    // When badge is near right edge, arrow should be offset to the right (>50%)
    const arrowStyle = arrow?.getAttribute('style') || '';

    // Arrow should have an inline left style (not 50% since badge is offset)
    // Badge center = 340px, viewport = 400px, tooltip width = 256px
    // Tooltip center clamped to maxLeft = 400 - 128 - 16 = 256
    // Tooltip left edge = 256 - 128 = 128px
    // Arrow offset = (340 - 128) / 256 * 100 = 82.8%
    expect(arrowStyle).toContain('left:');
    expect(arrowStyle).not.toContain('left: 50%');

    // Parse the left percentage and verify it's greater than 50%
    const leftMatch = arrowStyle.match(/left:\s*([\d.]+)%/);
    expect(leftMatch).toBeTruthy();
    const leftPercent = parseFloat(leftMatch![1]);
    expect(leftPercent).toBeGreaterThan(50);
  });

  it('positions tooltip arrow pointing at the badge when badge is near left edge', async () => {
    // Badge positioned near left edge
    // rect.left = 20, rect.width = 80, so center = 60
    // minLeft = 144, so tooltip center is clamped to 144
    // Arrow should point at 60, which is left of tooltip center

    const mockBadgeRect = {
      left: 20,
      right: 100,
      top: 100,
      bottom: 140,
      width: 80,
      height: 40,
      x: 20,
      y: 100,
      toJSON: () => ({}),
    };

    Element.prototype.getBoundingClientRect = vi.fn(() => mockBadgeRect);

    render(<PlayerArchetypeBadge archetype={mockArchetype} animate={false} />);

    const badge = screen.getByText('Strategist');
    fireEvent.mouseEnter(badge.closest('div')!);

    await waitFor(() => {
      expect(screen.getByText('A thoughtful player who plans their moves')).toBeInTheDocument();
    });

    const tooltipContainer = screen.getByText('A thoughtful player who plans their moves').closest('.fixed');
    const arrow = tooltipContainer?.querySelector('.rotate-45');
    expect(arrow).toBeInTheDocument();

    // The fix: arrow position is now dynamic via inline style
    // When badge is near left edge, arrow should be offset to the left (<50%)
    const arrowStyle = arrow?.getAttribute('style') || '';

    // Arrow should have an inline left style
    // Badge center = 60px, viewport = 400px, tooltip width = 256px
    // Tooltip center clamped to minLeft = 128 + 16 = 144
    // Tooltip left edge = 144 - 128 = 16px
    // Arrow offset = (60 - 16) / 256 * 100 = 17.2%
    expect(arrowStyle).toContain('left:');

    // Parse the left percentage and verify it's less than 50%
    const leftMatch = arrowStyle.match(/left:\s*([\d.]+)%/);
    expect(leftMatch).toBeTruthy();
    const leftPercent = parseFloat(leftMatch![1]);
    expect(leftPercent).toBeLessThan(50);
  });
});
