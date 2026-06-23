import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  NavigationProvider,
  useNavigation,
  useRegisterHeaderAudioControl,
} from '../NavigationContext';

/**
 * Ref-counted header-audio-control registration: while any screen registers an
 * in-header mute control, headerAudioControlActive is true so the global FAB
 * stands down. It must survive multiple concurrent registrants (StrictMode
 * double-mount, more than one screen) and flip back to false only once the last
 * one unmounts.
 */

function Probe() {
  const { headerAudioControlActive } = useNavigation();
  return <div data-testid="active">{String(headerAudioControlActive)}</div>;
}

function Registrant() {
  useRegisterHeaderAudioControl();
  return null;
}

describe('NavigationContext header audio control', () => {
  it('defaults to inactive', () => {
    render(
      <NavigationProvider>
        <Probe />
      </NavigationProvider>,
    );
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });

  it('activates while registered and deactivates only after the last unmounts', () => {
    function Harness({ a, b }: { a: boolean; b: boolean }) {
      return (
        <NavigationProvider>
          <Probe />
          {a && <Registrant />}
          {b && <Registrant />}
        </NavigationProvider>
      );
    }
    const { rerender } = render(<Harness a={false} b={false} />);
    expect(screen.getByTestId('active')).toHaveTextContent('false');

    act(() => rerender(<Harness a b />));
    expect(screen.getByTestId('active')).toHaveTextContent('true');

    // One unregisters — still active because the other holds the count.
    act(() => rerender(<Harness a b={false} />));
    expect(screen.getByTestId('active')).toHaveTextContent('true');

    // Last unregisters — back to inactive.
    act(() => rerender(<Harness a={false} b={false} />));
    expect(screen.getByTestId('active')).toHaveTextContent('false');
  });
});
