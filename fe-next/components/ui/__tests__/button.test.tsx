/**
 * Button — gradient variant, haptic feedback, pop animation.
 *
 * Extending the canonical shadcn Button with the only 3 real capabilities
 * EnhancedButton's call sites actually used (haptic: 7 sites, animation="pop":
 * 6 sites, variant="gradient": 1 site) before retiring the duplicate —
 * isLoading/isSuccess/isError/leftIcon/rightIcon/jelly/wobble/shake had zero
 * production call sites and are not being ported.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('renders the gradient variant', () => {
    render(<Button variant="gradient">Connect</Button>);
    expect(screen.getByText('Connect')).toHaveClass('from-neo-pink');
  });

  it('vibrates on click when haptic is set and navigator.vibrate exists', () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    render(<Button haptic>Tap me</Button>);
    fireEvent.click(screen.getByText('Tap me'));
    expect(vibrate).toHaveBeenCalledWith(50);
  });

  it('does not throw when haptic is set but navigator.vibrate is unavailable', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    render(<Button haptic>Tap me</Button>);
    expect(() => fireEvent.click(screen.getByText('Tap me'))).not.toThrow();
  });

  it('still fires the caller-provided onClick when haptic is set', () => {
    const onClick = vi.fn();
    render(<Button haptic onClick={onClick}>Tap me</Button>);
    fireEvent.click(screen.getByText('Tap me'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders normally with animation="pop" (no crash, content intact)', () => {
    render(<Button animation="pop">Go</Button>);
    expect(screen.getByText('Go')).toBeInTheDocument();
  });
});
