/**
 * PowerHourBadge Component Tests
 *
 * Tests for the badge shown in StreakBar during active Power Hour.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock usePowerHour
const mockUsePowerHour = vi.fn();
vi.mock('@/hooks/usePowerHour', () => ({
  usePowerHour: () => mockUsePowerHour(),
}));

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'powerHour.badge': `\u26A1 ${params?.time ?? ''}`,
        'powerHour.expired': 'Boost Complete!',
      };
      return translations[key] ?? key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock useReducedMotion
vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: vi.fn(() => false),
}));

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MockMotionDiv = React.forwardRef(
    (
      { children, ...props }: React.PropsWithChildren<Record<string, unknown>>,
      ref: React.Ref<HTMLDivElement>
    ) =>
      React.createElement(
        'div',
        { ...props, ref, 'data-testid': props['data-testid'] },
        children
      )
  );
  MockMotionDiv.displayName = 'MockMotionDiv';
  return {
    m: { div: MockMotionDiv, span: MockMotionDiv },
    AnimatePresence: ({ children }: React.PropsWithChildren) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { PowerHourBadge } from '../PowerHourBadge';

describe('PowerHourBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when power hour is not active and not expired', () => {
    mockUsePowerHour.mockReturnValue({
      active: false,
      remainingMinutes: 0,
      remainingSeconds: 0,
      expired: false,
      activate: vi.fn(),
    });

    const { container } = render(<PowerHourBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('should render countdown when active', () => {
    mockUsePowerHour.mockReturnValue({
      active: true,
      remainingMinutes: 47,
      remainingSeconds: 23,
      expired: false,
      activate: vi.fn(),
    });

    render(<PowerHourBadge />);
    expect(screen.getByTestId('power-hour-badge')).toBeInTheDocument();
    expect(screen.getByText('\u26A1 47:23')).toBeInTheDocument();
  });

  it('should pad single-digit seconds with zero', () => {
    mockUsePowerHour.mockReturnValue({
      active: true,
      remainingMinutes: 5,
      remainingSeconds: 3,
      expired: false,
      activate: vi.fn(),
    });

    render(<PowerHourBadge />);
    expect(screen.getByText('\u26A1 5:03')).toBeInTheDocument();
  });

  it('should show expired message when boost finishes', () => {
    mockUsePowerHour.mockReturnValue({
      active: false,
      remainingMinutes: 0,
      remainingSeconds: 0,
      expired: true,
      activate: vi.fn(),
    });

    render(<PowerHourBadge />);
    expect(screen.getByText('Boost Complete!')).toBeInTheDocument();
  });

  it('should have neo-cyan glow styling when active', () => {
    mockUsePowerHour.mockReturnValue({
      active: true,
      remainingMinutes: 30,
      remainingSeconds: 0,
      expired: false,
      activate: vi.fn(),
    });

    render(<PowerHourBadge />);
    const badge = screen.getByTestId('power-hour-badge');
    expect(badge.className).toContain('text-neo-cyan');
  });
});
