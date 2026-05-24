/**
 * EarthquakeWarning — effect description line test
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EarthquakeWarning } from '../EarthquakeWarning';

// Mock motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      if (key === 'earthquake.warning') return 'EARTHQUAKE';
      if (key === 'earthquake.brace') return 'Brace for impact';
      if (key === 'earthquake.effect') return 'The whole board is replaced — score fast for 2× points';
      return key;
    },
  }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableEarthquakeEffects: () => false,
  useShouldReduceMotion: () => false,
}));

describe('EarthquakeWarning effect line (catalyst unification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the plain-language effect description', () => {
    render(<EarthquakeWarning isVisible={true} />);
    expect(
      screen.getByText('The whole board is replaced — score fast for 2× points')
    ).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    const { container } = render(<EarthquakeWarning isVisible={false} />);
    expect(
      container.querySelector('[role="alert"]')
    ).not.toBeInTheDocument();
  });

  it('renders the effect line after the brace text', () => {
    render(<EarthquakeWarning isVisible={true} />);
    const braceText = screen.getByText('Brace for impact');
    const effectText = screen.getByText('The whole board is replaced — score fast for 2× points');

    expect(braceText).toBeInTheDocument();
    expect(effectText).toBeInTheDocument();

    // Verify effect comes after brace in the DOM
    const braceParent = braceText.parentElement;
    const effectParent = effectText.parentElement;
    expect(braceParent?.parentElement).toBe(effectParent?.parentElement);
  });
});
