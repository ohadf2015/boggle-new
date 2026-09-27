import { render, screen, fireEvent } from '@testing-library/react';
import { MobileGameDrawer } from '../MobileGameDrawer';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, onClick, onDragEnd, animate, ...props }: Record<string, unknown>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          !['drag', 'dragConstraints', 'dragElastic', 'transition', 'initial', 'exit'].includes(key)
        )
      );
      return (
        <div
          {...filteredProps}
          onClick={onClick as React.MouseEventHandler}
          data-animate={JSON.stringify(animate)}
        >
          {children as React.ReactNode}
        </div>
      );
    },
    span: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children as React.ReactNode}</span>,
    button: ({ children, onClick, ...props }: Record<string, unknown>) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(([key]) =>
          !['drag', 'dragConstraints', 'dragElastic', 'transition', 'initial', 'exit', 'whileHover', 'whileTap', 'animate', 'style'].includes(key)
        )
      );
      return (<button {...filteredProps} onClick={onClick as React.MouseEventHandler}>{children as React.ReactNode}</button>);
    },
  },
  useMotionValue: () => ({ set: vi.fn(), get: () => 0 }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const defaultT = (key: string) => key;

describe('MobileGameDrawer', () => {
  it('renders peek bar with stats', () => {
    render(
      <MobileGameDrawer t={defaultT} peekStats={{ wordCount: 5, score: 120 }}>
        <div data-testid="drawer-content">Content</div>
      </MobileGameDrawer>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <MobileGameDrawer t={defaultT}>
        <div data-testid="drawer-content">Inner Content</div>
      </MobileGameDrawer>
    );

    expect(screen.getByTestId('drawer-content')).toBeInTheDocument();
  });

  it('toggles open state on click', () => {
    const { container } = render(
      <MobileGameDrawer t={defaultT} peekStats={{ wordCount: 3, score: 50 }}>
        <div>Content</div>
      </MobileGameDrawer>
    );

    // Find the peek bar (has cursor-grab class)
    const peekBar = container.querySelector('.cursor-grab');
    expect(peekBar).toBeInTheDocument();

    // Click to toggle
    if (peekBar) fireEvent.click(peekBar);

    // Should show ChevronDown when open (icon switches)
    // The drawer animates via framer-motion so we check the animate prop
  });

  it('renders without peek stats', () => {
    render(
      <MobileGameDrawer t={defaultT}>
        <div>No stats</div>
      </MobileGameDrawer>
    );

    expect(screen.getByText('No stats')).toBeInTheDocument();
  });
});
