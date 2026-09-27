import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, afterEach } from 'vitest';
import { useOnboardingActive } from '../useOnboardingActive';

function Probe() {
  const active = useOnboardingActive();
  return <div data-testid="probe">{active ? 'active' : 'idle'}</div>;
}

describe('useOnboardingActive', () => {
  afterEach(() => {
    document.documentElement.classList.remove('onboarding-active');
  });

  it('reports idle when the onboarding-active class is absent', () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('idle');
  });

  it('reflects the class already present at mount', () => {
    document.documentElement.classList.add('onboarding-active');
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('active');
  });

  it('reacts when the class is added after mount', async () => {
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('idle');
    await act(async () => {
      document.documentElement.classList.add('onboarding-active');
      // let the MutationObserver microtask flush
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByTestId('probe')).toHaveTextContent('active');
  });

  it('reacts when the class is removed after mount', async () => {
    document.documentElement.classList.add('onboarding-active');
    render(<Probe />);
    expect(screen.getByTestId('probe')).toHaveTextContent('active');
    await act(async () => {
      document.documentElement.classList.remove('onboarding-active');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(screen.getByTestId('probe')).toHaveTextContent('idle');
  });
});
