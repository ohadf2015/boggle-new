import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BoostPicker } from './BoostPicker';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';

const t = (k: string) => {
  // Mock with basic placeholder substitution for testing
  if (k === 'boosts.remaining') return '3 / 5';
  return k;
};
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'en' }) }));
vi.mock('@/hooks/useBoostStatus', () => ({ useBoostStatus: () => ({ status: { remaining: 3, capPerDay: 5, resetAt: '' }, isLoading: false }) }));
const claimMock = vi.fn();
vi.mock('@/hooks/useBoostClaim', () => ({ useBoostClaim: () => ({ claim: claimMock, claimed: null, isLoading: false, error: null }) }));
vi.mock('@/lib/pixiFx/SharedFxApp', () => ({
  SharedFxApp: { spawnBurst: vi.fn(), isInitialized: () => true },
}));

describe('BoostPicker', () => {
  it('shows only mp-eligible boosts in mp mode', () => {
    render(<BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(screen.getByText('boosts.hint.title')).toBeInTheDocument();
    expect(screen.getByText('boosts.scoreMultiplier.title')).toBeInTheDocument();
    expect(screen.getByText('boosts.firstWordBonus.title')).toBeInTheDocument();
    expect(screen.queryByText('boosts.freezeTime.title')).not.toBeInTheDocument();
  });

  it('shows freezeTime in classic mode but not firstWordBonus', () => {
    render(<BoostPicker open mode="classic" sessionId="s1" onClose={() => {}} />);
    expect(screen.getByText('boosts.freezeTime.title')).toBeInTheDocument();
    expect(screen.queryByText('boosts.firstWordBonus.title')).not.toBeInTheDocument();
  });

  it('renders remaining count from status', () => {
    render(<BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(screen.getByText(/3.*5/)).toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(<BoostPicker open={false} mode="mp" sessionId="s1" onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('Escape closes the picker', () => {
    const onClose = vi.fn();
    render(<BoostPicker open mode="mp" sessionId="s1" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('fires pixi flourish burst when boost card is claimed', () => {
    const spawnSpy = vi.mocked(SharedFxApp.spawnBurst);
    spawnSpy.mockClear();
    claimMock.mockClear();

    render(<BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />);
    const hintCard = screen.getByText('boosts.hint.title').closest('button');
    fireEvent.click(hintCard!);

    expect(claimMock).toHaveBeenCalledWith('hint');
    expect(spawnSpy).toHaveBeenCalledWith(
      'boost-hint',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('renders an icon for each eligible boost card (decorative, aria-hidden)', () => {
    const { container } = render(<BoostPicker open mode="mp" sessionId="s1" onClose={() => {}} />);
    // 3 mp-eligible boosts: hint, scoreMultiplier, firstWordBonus
    const cards = container.querySelectorAll('[data-boost-card]');
    expect(cards.length).toBe(3);
    cards.forEach((card) => {
      const icon = card.querySelector('[data-boost-icon]');
      expect(icon).not.toBeNull();
      expect(icon?.getAttribute('aria-hidden')).toBe('true');
    });
  });
});
