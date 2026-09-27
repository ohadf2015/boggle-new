/**
 * FinaleCard — same slot-typing UX as PuzzleCard (shared useBridgeTyping hook).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FinaleCard from '../pyramid/FinaleCard';
import type { PyramidPuzzle } from '@/lib/connections/pyramid/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/hooks/useRewardedFeatureUnlock', () => ({
  useRewardedFeatureUnlock: () => ({ canShowAd: true, status: 'idle', offer: vi.fn() }),
}));

const pyramid: PyramidPuzzle = {
  id: 'py1',
  metaAnswer: 'BALL',
  base: [],
  difficulty: 'easy',
} as unknown as PyramidPuzzle;

function renderFinale(input = '', handlers: { onInputChange?: ReturnType<typeof vi.fn>; onSubmit?: ReturnType<typeof vi.fn> } = {}) {
  const onInputChange = handlers.onInputChange ?? vi.fn();
  const onSubmit = handlers.onSubmit ?? vi.fn();
  render(
    <FinaleCard
      bridges={['BASKET', 'FOOT', 'MEAT']}
      pyramid={pyramid}
      input={input}
      wrongAttempts={0}
      hintRevealed={false}
      status="playing"
      onInputChange={onInputChange}
      onSubmit={onSubmit}
      onGiveUp={vi.fn()}
      onRevealHint={vi.fn()}
      onNext={vi.fn()}
      isAdmin={false}
    />,
  );
  return { onInputChange, onSubmit };
}

describe('FinaleCard — slot typing', () => {
  beforeEach(() => window.localStorage.clear());

  it('renders one answer slot per meta-answer letter', () => {
    renderFinale();
    expect(screen.getAllByTestId('answer-slot')).toHaveLength(4);
  });

  it('appends physical-keyboard letters', () => {
    const { onInputChange } = renderFinale('');
    fireEvent.keyDown(window, { key: 'b' });
    expect(onInputChange).toHaveBeenCalledWith('B');
  });

  it('caps typing at the meta-answer length', () => {
    const { onInputChange } = renderFinale('BALL');
    fireEvent.keyDown(window, { key: 's' });
    expect(onInputChange).not.toHaveBeenCalled();
  });
});
