/**
 * Integration test: 3 valid words submitted via the real <GridComponent>
 * (mocked here for test-isolation) → progress is written + chain CTA reveals.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import PracticeClassicSandbox from '../PracticeClassicSandbox';
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

describe('PracticeClassicSandbox completion integration', () => {
  it('writes progress + reveals chain CTA after the 3rd valid word', async () => {
    render(<PracticeClassicSandbox />);
    expect(isPracticeModeComplete('classic', 'en')).toBe(false);
    expect(screen.queryByTestId('practice-chain-cta')).toBeNull();

    submitWord('STAR');
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(1));
    submitWord('PLAN');
    await waitFor(() => expect(validatorCheck).toHaveBeenCalledTimes(2));
    submitWord('TIN');
    await waitFor(() => {
      expect(screen.getByTestId('practice-chain-cta')).toBeInTheDocument();
    });
    expect(isPracticeModeComplete('classic', 'en')).toBe(true);
  });
});
