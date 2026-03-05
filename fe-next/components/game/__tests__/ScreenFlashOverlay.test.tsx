import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ScreenFlashOverlay } from '../ScreenFlashOverlay';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('ScreenFlashOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when trigger is 0', () => {
    const { container } = render(<ScreenFlashOverlay trigger={0} />);
    expect(container.querySelector('.bg-white')).not.toBeInTheDocument();
  });

  it('renders flash overlay when trigger increments', () => {
    const { rerender } = render(<ScreenFlashOverlay trigger={0} />);
    rerender(<ScreenFlashOverlay trigger={1} />);
    expect(screen.getByTestId('screen-flash')).toBeInTheDocument();
  });

  it('flash disappears after 200ms', () => {
    const { rerender } = render(<ScreenFlashOverlay trigger={0} />);
    rerender(<ScreenFlashOverlay trigger={1} />);
    expect(screen.getByTestId('screen-flash')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.queryByTestId('screen-flash')).not.toBeInTheDocument();
  });

  it('flash is full-screen with z-40 and pointer-events-none', () => {
    const { rerender } = render(<ScreenFlashOverlay trigger={0} />);
    rerender(<ScreenFlashOverlay trigger={1} />);
    const flash = screen.getByTestId('screen-flash');
    expect(flash.className).toContain('inset-0');
    expect(flash.className).toContain('z-40');
    expect(flash.className).toContain('pointer-events-none');
  });

  it('triggers again on subsequent increments', () => {
    const { rerender } = render(<ScreenFlashOverlay trigger={0} />);
    rerender(<ScreenFlashOverlay trigger={1} />);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(screen.queryByTestId('screen-flash')).not.toBeInTheDocument();

    rerender(<ScreenFlashOverlay trigger={2} />);
    expect(screen.getByTestId('screen-flash')).toBeInTheDocument();
  });
});
