/**
 * Tests for BlastComboFlash — full-screen combo flash overlay.
 * TDD: written before implementation.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { getComboTier, getComboFlashColor, BlastComboFlash } from '../BlastComboFlash';
import type { BlastComboType } from '../utils/blastCombos';

// ---- Mocks ----

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onAnimationComplete, style, className, 'data-testid': testId, ...rest }: any) => {
      // Simulate animation completing immediately for tests
      React.useEffect(() => { // eslint-disable-line react-hooks/rules-of-hooks
        if (onAnimationComplete) onAnimationComplete();
      }, [onAnimationComplete]);
      return (
        <div
          data-testid={testId}
          className={className}
          style={style}
          {...rest}
        >
          {children}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}));

// Mock AccessibilityContext
jest.mock('@/contexts/AccessibilityContext', () => ({
  useShouldReduceMotion: () => false,
}));

// ==================== getComboTier ====================

describe('getComboTier', () => {
  it('returns 3 for prism_prism (scoreMultiplier 10)', () => {
    expect(getComboTier('prism_prism')).toBe(3);
  });

  it('returns 3 for prism_rainbow (scoreMultiplier 7)', () => {
    expect(getComboTier('prism_rainbow')).toBe(3);
  });

  it('returns 3 for lightning_prism (scoreMultiplier 6)', () => {
    expect(getComboTier('lightning_prism')).toBe(3);
  });

  it('returns 2 for bomb_prism (scoreMultiplier 5)', () => {
    expect(getComboTier('bomb_prism')).toBe(2);
  });

  it('returns 2 for rainbow_mirror (scoreMultiplier 5)', () => {
    expect(getComboTier('rainbow_mirror')).toBe(2);
  });

  it('returns 2 for prism_mirror (scoreMultiplier 6)', () => {
    expect(getComboTier('prism_mirror')).toBe(2);
  });

  it('returns 2 for bomb_lightning (scoreMultiplier 4)', () => {
    expect(getComboTier('bomb_lightning')).toBe(2);
  });

  it('returns 1 for bomb_bomb (scoreMultiplier 3)', () => {
    expect(getComboTier('bomb_bomb')).toBe(1);
  });

  it('returns 1 for lightning_frozen (scoreMultiplier 3)', () => {
    expect(getComboTier('lightning_frozen')).toBe(1);
  });

  it('returns 1 for gold_special', () => {
    expect(getComboTier('gold_special')).toBe(1);
  });

  it('returns 1 for rainbow_special', () => {
    expect(getComboTier('rainbow_special')).toBe(1);
  });

  it('returns 1 for triple_special', () => {
    expect(getComboTier('triple_special')).toBe(1);
  });
});

// ==================== getComboFlashColor ====================

describe('getComboFlashColor', () => {
  it('returns cyan for tier 1', () => {
    expect(getComboFlashColor(1)).toBe('#00FFFF');
  });

  it('returns orange for tier 2', () => {
    expect(getComboFlashColor(2)).toBe('#FF6B35');
  });

  it('returns rainbow gradient for tier 3', () => {
    const color = getComboFlashColor(3);
    expect(color).toContain('linear-gradient');
    expect(color).toContain('#FF1493');
    expect(color).toContain('#00FFFF');
  });
});

// ==================== BlastComboFlash component ====================

describe('BlastComboFlash', () => {
  const onComplete = jest.fn();

  beforeEach(() => {
    onComplete.mockClear();
  });

  it('renders nothing when activeFlash is null', () => {
    const { container } = render(
      <BlastComboFlash activeFlash={null} onComplete={onComplete} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a flash overlay when activeFlash is provided', () => {
    render(
      <BlastComboFlash
        activeFlash={{ id: 'flash-1', comboType: 'bomb_lightning' }}
        onComplete={onComplete}
      />,
    );
    expect(screen.getByTestId('combo-flash')).toBeInTheDocument();
  });

  it('has pointer-events-none class', () => {
    render(
      <BlastComboFlash
        activeFlash={{ id: 'flash-1', comboType: 'bomb_bomb' }}
        onComplete={onComplete}
      />,
    );
    const el = screen.getByTestId('combo-flash');
    expect(el.className).toContain('pointer-events-none');
  });

  it('has z-40 positioning class', () => {
    render(
      <BlastComboFlash
        activeFlash={{ id: 'flash-1', comboType: 'bomb_bomb' }}
        onComplete={onComplete}
      />,
    );
    const el = screen.getByTestId('combo-flash');
    expect(el.className).toContain('z-40');
  });

  it('has absolute inset-0 positioning', () => {
    render(
      <BlastComboFlash
        activeFlash={{ id: 'flash-1', comboType: 'bomb_bomb' }}
        onComplete={onComplete}
      />,
    );
    const el = screen.getByTestId('combo-flash');
    expect(el.className).toContain('absolute');
    expect(el.className).toContain('inset-0');
  });

  it('uses cyan color for tier 1 combo type', () => {
    // Tier 1 → cyan
    expect(getComboFlashColor(1)).toBe('#00FFFF');
    render(
      <BlastComboFlash
        activeFlash={{ id: 'flash-1', comboType: 'bomb_bomb' }}
        onComplete={onComplete}
      />,
    );
    // Flash container renders with children (radial gradient is in nested elements)
    const el = screen.getByTestId('combo-flash');
    expect(el.children.length).toBeGreaterThan(0);
  });

  it('uses orange color for tier 2 combo type', () => {
    // Tier 2 → orange
    expect(getComboFlashColor(2)).toBe('#FF6B35');
    render(
      <BlastComboFlash
        activeFlash={{ id: 'flash-1', comboType: 'bomb_lightning' }}
        onComplete={onComplete}
      />,
    );
    const el = screen.getByTestId('combo-flash');
    // Tier 2+ has a sweep line child
    expect(el.children.length).toBeGreaterThanOrEqual(2);
  });

  it('uses rainbow gradient for tier 3 combo type (prism_prism)', () => {
    expect(getComboFlashColor(3)).toContain('linear-gradient');
    render(
      <BlastComboFlash
        activeFlash={{ id: 'flash-1', comboType: 'prism_prism' }}
        onComplete={onComplete}
      />,
    );
    const el = screen.getByTestId('combo-flash');
    expect(el).toBeInTheDocument();
    // Tier 3 has radial + sweep children
    expect(el.children.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onComplete with flash id after animation', () => {
    render(
      <BlastComboFlash
        activeFlash={{ id: 'my-flash-id', comboType: 'prism_prism' }}
        onComplete={onComplete}
      />,
    );
    expect(onComplete).toHaveBeenCalledWith('my-flash-id');
  });
});
