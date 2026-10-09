import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const generateDaily = vi.fn();
const generateFreeplay = vi.fn();
vi.mock('@/lib/crossword/generate.daily', () => ({
  generateDailyPuzzle: (...a: unknown[]) => generateDaily(...a),
  generateFreeplayPuzzle: (...a: unknown[]) => generateFreeplay(...a),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'ru', dir: 'ltr' }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/components/tutorial/ModeCoach', () => ({ ModeCoach: () => null }));
vi.mock('@/components/crossword/CrosswordLoader', () => ({
  CrosswordLoader: () => <div data-testid="loader" />,
}));

import { CrosswordPageClient } from '../CrosswordPageClient';

describe('CrosswordPageClient — locale without its own puzzles', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the unavailable state and never generates a puzzle for ru', () => {
    render(<CrosswordPageClient locale="ru" />);
    expect(screen.getByText('crossword.unavailable.title')).toBeInTheDocument();
    expect(screen.queryByTestId('loader')).toBeNull();
    expect(generateDaily).not.toHaveBeenCalled();
    expect(generateFreeplay).not.toHaveBeenCalled();
  });

  it('still generates for es', () => {
    generateDaily.mockResolvedValue(null);
    render(<CrosswordPageClient locale="es" />);
    expect(screen.queryByText('crossword.unavailable.title')).toBeNull();
    expect(generateDaily).toHaveBeenCalled();
  });
});
