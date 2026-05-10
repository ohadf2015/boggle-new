import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PracticeHubAtmosphere from './PracticeHubAtmosphere';

const matchMediaMock = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('PracticeHubAtmosphere', () => {
  beforeEach(() => {
    matchMediaMock(false);
  });

  it('renders ambient layer with aria-hidden (presentational)', () => {
    render(<PracticeHubAtmosphere />);
    const layer = screen.getByTestId('practice-hub-atmosphere');
    expect(layer).toBeInTheDocument();
    expect(layer).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders multiple iridescent orbs for depth', () => {
    render(<PracticeHubAtmosphere />);
    const orbs = screen.getAllByTestId(/practice-hub-atmosphere-orb-/);
    expect(orbs.length).toBeGreaterThanOrEqual(3);
  });

  it('marks data-reduced-motion when user prefers reduced motion', () => {
    matchMediaMock(true);
    render(<PracticeHubAtmosphere />);
    const layer = screen.getByTestId('practice-hub-atmosphere');
    expect(layer.getAttribute('data-reduced-motion')).toBe('true');
  });

  it('marks data-reduced-motion false when motion is allowed', () => {
    render(<PracticeHubAtmosphere />);
    const layer = screen.getByTestId('practice-hub-atmosphere');
    expect(layer.getAttribute('data-reduced-motion')).toBe('false');
  });

  it('does not block pointer events (decorative layer)', () => {
    render(<PracticeHubAtmosphere />);
    const layer = screen.getByTestId('practice-hub-atmosphere');
    expect(layer.className).toContain('pointer-events-none');
  });
});
