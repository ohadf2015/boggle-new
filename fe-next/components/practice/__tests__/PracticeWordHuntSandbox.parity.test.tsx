/**
 * PracticeWordHuntSandbox parity tests — verifies that practice reuses
 * the real Word Hunt clue UI, accepts sub-MIN_DISCOVERY words with
 * educational feedback, and fires celebration on success.
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
    t: (k: string, params?: Record<string, string | number>) => {
      if (!params) return k;
      const parts = Object.entries(params).map(([p, v]) => `${p}=${v}`).join(',');
      return `${k}|${parts}`;
    },
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

vi.mock('@/lib/practice/wordHuntPuzzle', () => ({
  generateWordHuntPuzzle: () => ({
    board: [['S', 'T', 'A', 'R'], ['E', 'O', 'N', 'I'], ['P', 'L', 'A', 'T'], ['E', 'R', 'I', 'N']],
    target: 'STAR',
  }),
  getWordHuntTargets: () => ['STAR'],
}));

import PracticeWordHuntSandbox from '../PracticeWordHuntSandbox';

const submitWord = (word: string) => {
  const btn = screen.getByTestId('stub-submit-word');
  btn.setAttribute('data-word', word);
  fireEvent.click(btn);
};

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  playWordAcceptedSound.mockReset();
  playWordRejectedSound.mockReset();
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox real-game parity', () => {
  it('renders the real SurvivalClueBoxes wrapper (replaces static target boxes)', () => {
    render(<PracticeWordHuntSandbox />);
    expect(screen.getByTestId('practice-clue-boxes')).toBeInTheDocument();
  });

  it('shows educational tip for sub-MIN_DISCOVERY words instead of silent drop', async () => {
    render(<PracticeWordHuntSandbox />);
    submitWord('A'); // length 1 < MIN_DISCOVERY=2
    await waitFor(() => {
      expect(screen.getByTestId('practice-short-tip')).toBeInTheDocument();
    });
    // Tip text should reference the shortWordTip key with the params injected.
    expect(screen.getByTestId('practice-short-tip').textContent).toContain('practice.wordHunt.shortWordTip');
    // Validator must NOT be invoked for sub-min input.
    expect(validatorCheck).not.toHaveBeenCalled();
  });

  it('plays accepted sound + renders confetti when target word is found', async () => {
    render(<PracticeWordHuntSandbox />);
    submitWord('STAR');
    await waitFor(() => {
      expect(playWordAcceptedSound).toHaveBeenCalled();
      expect(screen.getByTestId('practice-confetti')).toBeInTheDocument();
    });
  });

  it('plays accepted sound on bonus discovery (sub-target-length valid word)', async () => {
    render(<PracticeWordHuntSandbox />);
    submitWord('NIT'); // 3 letters, < target len 4, validator returns valid
    await waitFor(() => {
      expect(validatorCheck).toHaveBeenCalledWith('NIT');
      expect(playWordAcceptedSound).toHaveBeenCalled();
    });
  });

  it('plays rejected sound when discovery word is not in dictionary', async () => {
    validatorCheck.mockResolvedValue({ isValid: false, source: 'dictionary' });
    render(<PracticeWordHuntSandbox />);
    submitWord('XYZ');
    await waitFor(() => {
      expect(playWordRejectedSound).toHaveBeenCalled();
    });
  });
});
