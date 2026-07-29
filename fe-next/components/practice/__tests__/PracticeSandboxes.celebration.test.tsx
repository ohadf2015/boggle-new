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
    // WordWheelGame (now reused by the wheel sandbox) destructures these
    // non-optionally, so the stub must supply every fn it touches.
    playTileSelectSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playButtonClickSound: vi.fn(),
    playWordLengthSound: vi.fn(),
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="wheel-pixi-ring-stub" />,
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    screen = { width: 320, height: 240 };
    stage = { addChild: vi.fn(), removeChild: vi.fn(), removeChildren: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  Graphics: class {
    x = 0;
    y = 0;
    alpha = 1;
    scale = { set: vi.fn() };
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
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
  it('plays the accepted sound on a valid word (via the reused WordWheelGame)', async () => {
    render(<PracticeWheelSandbox />);
    // Real WordWheelGame convention: center A = index -1, outer T R C E S N = 0..5.
    // Build "CAT": C=idx2, A=center(-1), T=idx0 (≥3 letters, includes center A).
    fireEvent.click(screen.getByTestId('wheel-letter-2'));
    fireEvent.click(screen.getByTestId('wheel-letter--1'));
    fireEvent.click(screen.getByTestId('wheel-letter-0'));
    const submit = screen.getByTestId('word-wheel-action-bar').querySelector('button:nth-child(2)') as HTMLElement;
    fireEvent.click(submit);
    await waitFor(() => {
      expect(playWordAcceptedSound).toHaveBeenCalled();
    });
  });
});
