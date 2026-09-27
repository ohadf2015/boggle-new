/**
 * PowerHourActivation Component Tests
 *
 * Tests for the toast/modal that appears when Power Hour is activated.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';

// Mock LanguageContext
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'powerHour.activated': 'Power Hour Activated!',
        'powerHour.description': '2x XP for the next 60 minutes!',
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

import { PowerHourActivation } from '../PowerHourActivation';

describe('PowerHourActivation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render activation message when visible', () => {
    render(<PowerHourActivation visible onDismiss={vi.fn()} />);

    expect(screen.getByText('Power Hour Activated!')).toBeInTheDocument();
    expect(
      screen.getByText('2x XP for the next 60 minutes!')
    ).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    const { container } = render(
      <PowerHourActivation visible={false} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should auto-dismiss after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<PowerHourActivation visible onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should show lightning bolt icon', () => {
    render(<PowerHourActivation visible onDismiss={vi.fn()} />);
    expect(screen.getByTestId('power-hour-bolt')).toBeInTheDocument();
  });

  it('should have neo-cyan glow styling', () => {
    render(<PowerHourActivation visible onDismiss={vi.fn()} />);
    const container = screen.getByTestId('power-hour-activation');
    expect(container.className).toContain('neo-cyan');
  });
});
