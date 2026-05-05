/**
 * Verifies Classic + Wheel practice sandboxes fire the real-game
 * celebration primitives (sound + confetti) on word found — closing
 * parity gap with live Classic / Wheel Rush.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validatorCheck = vi.fn();
const playWordAcceptedSound = vi.fn();
const playWordRejectedSound = vi.fn();

vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (k: string) => k,
  }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound,
    playWordRejectedSound,
  }),
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
}));
vi.mock('@/components/GridComponent', () => ({
  default: ({ onWordSubmit }: { onWordSubmit?: (word: string) => void }) => (
    <div data-testid="grid-component-stub">
      <button
        type="button"
        data-testid="stub-submit-word"
        onClick={(e) => onWordSubmit?.((e.currentTarget as HTMLButtonElement).dataset.word ?? '')}
      />
      <div data-row="0" data-col="0" />
    </div>
  ),
}));
vi.mock('@/components/daily/WordWheelPixiRing', () => ({
  default: () => <div data-testid="wheel-pixi-ring-stub" />,
}));
vi.mock('@/components/daily/WordWheelParts', () => ({
  WheelLetter: ({
    letter, index, onPress,
  }: { letter: string; index: number; onPress?: (l: string, i: number, el: HTMLButtonElement) => void }) => (
    <button
      type="button"
      data-testid={`wheel-letter-${index}`}
      data-wheel-index={index}
      onClick={(e) => onPress?.(letter, index, e.currentTarget as HTMLButtonElement)}
    >
      {letter}
    </button>
  ),
  WordTile: ({ letter, index }: { letter: string; index: number }) => (
    <span data-testid={`word-tile-${index}`}>{letter}</span>
  ),
}));

import PracticeClassicSandbox from '../PracticeClassicSandbox';
import PracticeWheelSandbox from '../PracticeWheelSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  playWordAcceptedSound.mockReset();
  playWordRejectedSound.mockReset();
  window.localStorage.clear();
});

describe('PracticeClassicSandbox celebration parity', () => {
  it('plays accepted sound + shows confetti on valid word', async () => {
    render(<PracticeClassicSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'STAR');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(playWordAcceptedSound).toHaveBeenCalled();
      expect(screen.getByTestId('practice-confetti')).toBeInTheDocument();
    });
  });

  it('plays rejected sound on invalid word', async () => {
    validatorCheck.mockResolvedValue({ isValid: false });
    render(<PracticeClassicSandbox />);
    const btn = screen.getByTestId('stub-submit-word');
    btn.setAttribute('data-word', 'XQZ');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(playWordRejectedSound).toHaveBeenCalled();
    });
  });
});

describe('PracticeWheelSandbox celebration parity', () => {
  it('plays accepted sound + shows confetti on valid word', async () => {
    render(<PracticeWheelSandbox />);
    // EN puzzle: center A (idx 0), outer T R C E S N → idx 1..6
    // Build "CAT": C=idx3 A=idx0 T=idx1 (≥3 letters, includes center A)
    fireEvent.click(screen.getByTestId('wheel-letter-3'));
    fireEvent.click(screen.getByTestId('wheel-letter-0'));
    fireEvent.click(screen.getByTestId('wheel-letter-1'));
    fireEvent.click(screen.getByTestId('practice-wheel-submit'));
    await waitFor(() => {
      expect(playWordAcceptedSound).toHaveBeenCalled();
      expect(screen.getByTestId('practice-confetti')).toBeInTheDocument();
    });
  });
});
