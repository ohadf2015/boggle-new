import React from 'react';
import { render, screen } from '@testing-library/react';
import PlacementMascot from '../PlacementMascot';

// Mock framer-motion — passthrough all SVG/HTML elements
vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
   
  const handler: ProxyHandler<any> = {
    get(_target, tag: string) {
      const component = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        // Strip framer-motion-specific props, keep standard HTML/SVG ones
        const {
          variants, initial, animate, exit, transition, whileHover, whileTap,
          whileDrag, whileFocus, whileInView, layout, layoutId,
          onAnimationStart, onAnimationComplete, ...rest
        } = props;
        return React.createElement(tag, { ...rest, ref });
      });
      component.displayName = `motion.${tag}`;
      return component;
    },
  };
  return {
    ...actual,
    motion: new Proxy({}, handler),
    AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  };
});

vi.mock('@/hooks/useReducedMotion', () => ({
  __esModule: true,
  default: () => false,
}));

describe('PlacementMascot', () => {

  it('renders the mascot container', () => {
    render(<PlacementMascot rank={1} />);
    expect(screen.getByTestId('placement-mascot')).toBeInTheDocument();
  });

  it('renders winner expression for rank 1', () => {
    render(<PlacementMascot rank={1} />);
    expect(screen.getByTestId('mascot-expression-winner')).toBeInTheDocument();
  });

  it('renders silver expression for rank 2', () => {
    render(<PlacementMascot rank={2} />);
    expect(screen.getByTestId('mascot-expression-silver')).toBeInTheDocument();
  });

  it('renders bronze expression for rank 3', () => {
    render(<PlacementMascot rank={3} />);
    expect(screen.getByTestId('mascot-expression-bronze')).toBeInTheDocument();
  });

  it('renders default expression for rank 4+', () => {
    render(<PlacementMascot rank={5} />);
    expect(screen.getByTestId('mascot-expression-default')).toBeInTheDocument();
  });

  it('renders crown for rank 1', () => {
    render(<PlacementMascot rank={1} />);
    expect(screen.getByTestId('mascot-crown')).toBeInTheDocument();
  });

  it('does not render crown for rank 2+', () => {
    render(<PlacementMascot rank={2} />);
    expect(screen.queryByTestId('mascot-crown')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PlacementMascot rank={1} className="my-custom" />);
    expect(screen.getByTestId('placement-mascot').className).toContain('my-custom');
  });

  it('renders SVG element', () => {
    render(<PlacementMascot rank={1} size={120} />);
    const container = screen.getByTestId('placement-mascot');
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
