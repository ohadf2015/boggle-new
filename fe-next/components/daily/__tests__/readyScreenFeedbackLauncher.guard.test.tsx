import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

import WordWheelReadyCard from '../WordWheelReadyCard';

const ROOT = join(__dirname, '..', '..', '..');

describe('the feedback launcher never covers a daily Play button', () => {
  it('hides the launcher while a daily ready screen is on the page', () => {
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8').replace(/\s+/g, ' ');
    expect(css).toMatch(/body:has\(\[data-daily-ready-content\]\) #fdw-root[^{]*\{ ?display: ?none;? ?\}/);
  });

  it('the Word Hunt ready screen carries the marker', () => {
    const src = readFileSync(join(ROOT, 'components', 'daily', 'DailyReadyScreen.tsx'), 'utf8');
    expect(src).toMatch(/data-daily-ready-content/);
  });

  it('the Word Wheel ready card carries the marker', () => {
    const { container } = render(
      <WordWheelReadyCard
        t={(k: string) => k}
        centerLetter="N"
        outerLetters={['W', 'G', 'H', 'A', 'I', 'T']}
        puzzleNumber={285}
        streakDays={0}
        onPlay={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-daily-ready-content]')).not.toBeNull();
  });
});
