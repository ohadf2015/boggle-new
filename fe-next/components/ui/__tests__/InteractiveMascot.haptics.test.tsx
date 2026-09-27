import { render, screen, fireEvent } from '@testing-library/react';
import InteractiveMascot from '../InteractiveMascot';

const tap = vi.fn();
vi.mock('@/utils/haptics', () => ({
  haptics: { tap: () => tap() },
}));

vi.mock('framer-motion', async () => {
  const actual: any = await vi.importActual('framer-motion');
  return {
    ...actual,
    m: new Proxy({}, {
      get: () => (props: any) => {
        const { children, ...rest } = props;
        return <div {...rest}>{children}</div>;
      },
    }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: false }),
}));

describe('InteractiveMascot haptics', () => {
  beforeEach(() => tap.mockClear());

  it('fires haptics.tap on click when enableClick', () => {
    const onClick = vi.fn();
    render(<InteractiveMascot variant="happy" enableClick onClick={onClick} />);
    const el = screen.getByTestId('interactive-mascot');
    fireEvent.click(el);
    expect(tap).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire haptics when enableClick is false', () => {
    render(<InteractiveMascot variant="happy" enableClick={false} />);
    const el = screen.getByTestId('interactive-mascot');
    fireEvent.click(el);
    expect(tap).not.toHaveBeenCalled();
  });
});
