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
    // 3-char word ending in mem (מ) → crane shows sofit (ם). Stays within 3-brick cap.
    render(<WordTowerCrane {...baseProps} word="שלמ" />);
    const beam = screen.getByTestId('crane-block');
    expect(beam.textContent).toBe('שלם');
    cleanup();
  });

  it('leaves the word untouched for non-Hebrew locales', () => {
    mockLanguage = 'en';
    // 3-char word stays within the 3-brick cap so no truncation or badge text.
    render(<WordTowerCrane {...baseProps} word="CAT" />);
    expect(screen.getByTestId('crane-block').textContent).toBe('CAT');
    cleanup();
  });
});
