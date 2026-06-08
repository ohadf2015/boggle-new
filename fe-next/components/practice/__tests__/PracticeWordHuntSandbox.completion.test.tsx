/**
 * Integration test: target-word submission via the real <GridComponent>
 * (mocked here for test-isolation) → progress + completion banner.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
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
import { isPracticeModeComplete } from '@/lib/practice/practiceProgress';

const submitWord = (word: string) => {
  const btn = screen.getByTestId('stub-submit-word');
  btn.setAttribute('data-word', word);
  fireEvent.click(btn);
};

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

describe('PracticeWordHuntSandbox completion integration', () => {
  it('writes progress + reveals chain CTA after spelling the target', async () => {
    render(<PracticeWordHuntSandbox />);

    expect(screen.queryByTestId('practice-complete-banner')).toBeNull();
    expect(isPracticeModeComplete('wordHunt', 'en')).toBe(false);

    submitWord('STAR'); // EN target
    await waitFor(() => {
      expect(screen.getByTestId('practice-complete-banner')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('wordHunt', 'en')).toBe(true);
  });
});
