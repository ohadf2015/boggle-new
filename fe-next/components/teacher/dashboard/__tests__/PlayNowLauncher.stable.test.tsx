/**
 * GO LIVE must hold still.
 *
 * The live-flow harness failed on /en/teacher with Playwright's "element is
 * not stable": the button carried its own hover/active translate and a
 * `transition-all`, so it kept moving under the pointer — and on a real
 * device it shifts under a finger mid-tap. Any beacon or press feel lives on a
 * SIBLING (the absolutely positioned ring behind it) or on non-geometric
 * properties (shadow, colour); the button element itself never animates its
 * transform, position or size.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, vars?: Record<string, unknown>) => (vars ? `${k}:${JSON.stringify(vars)}` : k),
    language: 'en',
  }),
}));
vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({
    lessons: [
      { id: 'l1', name: 'Unit 4 verbs', words: [{ word: 'a' }, { word: 'b' }], language: 'en' },
      { id: 'l2', name: 'Unit 5 nouns', words: [{ word: 'c' }], language: 'en' },
    ],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({ recentConfigs: [] }),
}));

import { PlayNowLauncher } from '../PlayNowLauncher';

describe('<PlayNowLauncher> — GO LIVE never moves', () => {
  it('Given the armed button, Then it carries no transform, translate, scale or animation classes', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const go = screen.getByTestId('play-now-go');
    const cls = go.className.toString();
    expect(cls).not.toMatch(/(^|[\s:])-?(translate|scale|rotate|skew)-/);
    expect(cls).not.toMatch(/(^|[\s:])(animate-|transform(\s|$))/);
    expect(cls).not.toMatch(/(^|\s)transition-all(\s|$)/);
  });

  it('Given the armed button, Then it is not itself a motion component (no inline transform)', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    expect(screen.getByTestId('play-now-go').style.transform).toBe('');
  });
});
