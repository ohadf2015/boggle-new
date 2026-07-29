import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

// Mock locale so the crane beam renders in Hebrew.
let mockLanguage = 'he';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: mockLanguage, setLanguage: vi.fn() }),
}));

import WordTowerCrane from './WordTowerCrane';

const baseProps = {
  consecutiveSloppy: 0,
  onDrop: vi.fn(),
  t: (k: string) => k,
  reducedMotion: true, // hold the carriage still — no rAF in tests
};

describe('WordTowerCrane Hebrew sofit beam', () => {
  it('renders the word-final letter in sofit form when locale is Hebrew', () => {
    mockLanguage = 'he';
    // Bag holds the regular mem (מ); the beam should show the sofit (ם).
    render(<WordTowerCrane {...baseProps} word="שלומ" />);
    const beam = screen.getByTestId('crane-block');
    expect(beam.textContent).toBe('שלום');
    cleanup();
  });

  it('leaves the word untouched for non-Hebrew locales', () => {
    mockLanguage = 'en';
    render(<WordTowerCrane {...baseProps} word="STACK" />);
    expect(screen.getByTestId('crane-block').textContent).toBe('STACK');
    cleanup();
  });
});
