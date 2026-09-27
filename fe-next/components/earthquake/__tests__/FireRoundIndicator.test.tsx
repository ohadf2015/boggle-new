/**
 * FireRoundIndicator — effect label test
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FireRoundIndicator } from '../FireRoundIndicator';

// Mock motion
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, className }: any) => <div className={className}>{children}</div>,
    span: ({ children, className }: any) => <span className={className}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      if (key === 'earthquake.fireRound') return 'FIRE ROUND';
      if (key === 'earthquake.multiplier') return '2× EVERYTHING';
      if (key === 'earthquake.effect') return 'The whole board is replaced — score fast for 2× points';
      return key;
    },
  }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableFireRoundLights: () => false,
  useShouldReduceMotion: () => false,
}));

describe('FireRoundIndicator effect label (catalyst unification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the effect description while active', () => {
    render(<FireRoundIndicator isActive={true} remainingSeconds={20} />);
    expect(
      screen.getByText('The whole board is replaced — score fast for 2× points')
    ).toBeInTheDocument();
  });

  it('does not render when isActive is false', () => {
    const { container } = render(<FireRoundIndicator isActive={false} remainingSeconds={20} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders fire round label along with effect', () => {
    render(<FireRoundIndicator isActive={true} remainingSeconds={20} />);
    expect(screen.getByText('FIRE ROUND')).toBeInTheDocument();
    expect(screen.getByText('2× EVERYTHING')).toBeInTheDocument();
    expect(
      screen.getByText('The whole board is replaced — score fast for 2× points')
    ).toBeInTheDocument();
  });

  it('displays the countdown timer', () => {
    render(<FireRoundIndicator isActive={true} remainingSeconds={15} />);
    expect(screen.getByText('15s')).toBeInTheDocument();
  });
});
