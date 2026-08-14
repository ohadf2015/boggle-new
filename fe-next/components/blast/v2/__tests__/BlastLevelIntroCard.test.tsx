import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BlastLevel } from '@/lib/blast/v2/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

import { BlastLevelIntroCard } from '../BlastLevelIntroCard';

const level: BlastLevel = {
  id: 'intro-test',
  levelNumber: 7,
  locale: 'en',
  theme: 'animals',
  columns: [{ index: 0, tiles: ['C', 'A', 'T'] }],
  words: ['CAT'],
  resolvableOrder: ['CAT'],
  tileFlags: {},
  gravityMode: 'standard',
  difficulty: 1,
};

describe('BlastLevelIntroCard', () => {
  it('shows the Wordfall brand wordmark (renamed from Blast V2)', () => {
    render(<BlastLevelIntroCard level={level} onDismiss={vi.fn()} />);
    expect(screen.getByTestId('wordfall-wordmark')).toHaveTextContent('Wordfall');
  });

  it('shows the theme chip beside the theme name for level identity', () => {
    render(<BlastLevelIntroCard level={level} onDismiss={vi.fn()} />);
    const chip = screen.getByTestId('intro-card').querySelector('img[src^="/themes/"]');
    expect(chip).toHaveAttribute('src', '/themes/animals.svg');
  });

  it('renders no emoji on the intro card', () => {
    render(<BlastLevelIntroCard level={level} onDismiss={vi.fn()} />);
    const text = screen.getByTestId('intro-card').textContent ?? '';
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
