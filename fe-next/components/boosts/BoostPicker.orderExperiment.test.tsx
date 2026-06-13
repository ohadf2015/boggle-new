/**
 * BoostPicker order experiment.
 *
 * Variants:
 *   control      → BOOST_TYPES order (default)
 *   score-first  → scoreMultiplier card appears first
 *   freeze-first → freezeTime card appears first
 *
 * Other eligible boosts retain their relative order. Tests assert the
 * grid's first-card matches the expected boost per variant, and that
 * trackExposure fires once on open.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { BoostPicker } from './BoostPicker';

const mockVariant = vi.fn<() => string>(() => 'control');
const mockTrackExposure = vi.fn();

vi.mock('@/hooks/useExperiment', () => ({
  useExperiment: () => ({ variant: mockVariant(), trackExposure: mockTrackExposure }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/hooks/useBoostStatus', () => ({
  useBoostStatus: () => ({
    status: { remaining: 3, capPerDay: 5, resetAt: '' },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useBoostClaim', () => ({
  useBoostClaim: () => ({ claim: vi.fn(), claimed: null, isLoading: false, error: null }),
}));

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: vi.fn() },
}));

function getCardOrder(container: HTMLElement): string[] {
  const cards = container.querySelectorAll<HTMLButtonElement>('[data-boost-card]');
  return Array.from(cards).map(c => c.getAttribute('aria-label') || '');
}

describe('BoostPicker — order experiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVariant.mockReturnValue('control');
  });

  it('control: BOOST_TYPES default order, scoreMultiplier not first in mp mode', () => {
    mockVariant.mockReturnValue('control');
    const { container } = render(
      <BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />
    );
    const order = getCardOrder(container);
    // mp-eligible default order: hint, scoreMultiplier, firstWordBonus
    expect(order[0]).toBe('boosts.hint.title');
    expect(order[1]).toBe('boosts.scoreMultiplier.title');
  });

  it('score-first: scoreMultiplier card is first in mp mode', () => {
    mockVariant.mockReturnValue('score-first');
    const { container } = render(
      <BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />
    );
    const order = getCardOrder(container);
    expect(order[0]).toBe('boosts.scoreMultiplier.title');
  });

  it('freeze-first: freezeTime card is first in classic mode', () => {
    mockVariant.mockReturnValue('freeze-first');
    const { container } = render(
      <BoostPicker open mode="classic" sessionId="s1" onClose={() => {}} />
    );
    const order = getCardOrder(container);
    expect(order[0]).toBe('boosts.freezeTime.title');
  });

  it('freeze-first in mp mode (no freezeTime eligible) leaves order unchanged', () => {
    // freezeTime is not mp-eligible → variant has no card to promote → falls through to control order.
    mockVariant.mockReturnValue('freeze-first');
    const { container } = render(
      <BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />
    );
    const order = getCardOrder(container);
    expect(order[0]).toBe('boosts.hint.title'); // unchanged from control
  });

  it('does not duplicate or drop cards when reordering', () => {
    mockVariant.mockReturnValue('score-first');
    const { container } = render(
      <BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />
    );
    const order = getCardOrder(container);
    expect(order).toHaveLength(3);
    expect(new Set(order).size).toBe(3);
  });

  it('fires trackExposure when picker opens', () => {
    render(<BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(mockTrackExposure).toHaveBeenCalled();
  });

  it('does NOT fire trackExposure when picker is closed', () => {
    render(<BoostPicker open={false} mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(mockTrackExposure).not.toHaveBeenCalled();
  });
});
