import React from 'react';
import { render, screen } from '@testing-library/react';
import { ScreenFlashOverlay } from '../ScreenFlashOverlay';

// Mock framer-motion — pass key through so we can assert remount on trigger change
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

describe('ScreenFlashOverlay', () => {
  it('renders nothing when trigger is 0', () => {
    render(<ScreenFlashOverlay trigger={0} />);
    expect(screen.queryByTestId('screen-flash')).not.toBeInTheDocument();
  });

  it('renders flash overlay when trigger is positive', () => {
    render(<ScreenFlashOverlay trigger={1} />);
    expect(screen.getByTestId('screen-flash')).toBeInTheDocument();
  });

  it('exposes trigger value via data attribute for remount assertions', () => {
    const { rerender } = render(<ScreenFlashOverlay trigger={1} />);
    expect(screen.getByTestId('screen-flash')).toHaveAttribute('data-trigger', '1');

    rerender(<ScreenFlashOverlay trigger={2} />);
    expect(screen.getByTestId('screen-flash')).toHaveAttribute('data-trigger', '2');
  });

  it('flash is full-screen with z-50 and pointer-events-none', () => {
    render(<ScreenFlashOverlay trigger={1} />);
    const flash = screen.getByTestId('screen-flash');
    expect(flash.className).toContain('inset-0');
    expect(flash.className).toContain('z-50');
    expect(flash.className).toContain('pointer-events-none');
  });

  it('applies custom colorClass', () => {
    render(<ScreenFlashOverlay trigger={1} colorClass="bg-red-500" />);
    expect(screen.getByTestId('screen-flash').className).toContain('bg-red-500');
  });
});
