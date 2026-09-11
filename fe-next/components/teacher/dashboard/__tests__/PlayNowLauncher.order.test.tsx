/**
 * The one button comes FIRST, not after the menu.
 *
 * Measured live at 390x844 on `/en/teacher`: the panel opened with a lime title
 * slab, a three-way source switch and a three-row list, and GO LIVE landed at
 * y=688 in an 844-tall viewport — the bottom 150px of the screen, below ~520px
 * of things to read. The panel is armed on arrival, so all of that is a menu the
 * teacher passes THROUGH to reach a decision that was already made for them.
 * That is the decision-fatigue rule in its exact words: choices are for changing
 * the default, never for reaching the next screen.
 *
 * So the order is: what we're about to play → GO LIVE → and, below it, the way
 * to change the words. DOM order, not just visual order — a teacher on a screen
 * reader hits the action before the menu too.
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

/** Document order of two nodes: negative when `a` comes first. */
const order = (a: Element, b: Element) =>
  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

describe('<PlayNowLauncher> — the action precedes the menu', () => {
  it('puts GO LIVE before the source switch and the picker', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const go = screen.getByTestId('play-now-go');
    const switcher = screen.getByTestId('play-now-source-recent');
    expect(order(go, switcher), 'GO LIVE must come before the source switch').toBe(-1);

    const list = screen.getByTestId('play-now-recent-list');
    expect(order(go, list), 'GO LIVE must come before the list of lists').toBe(-1);
  });

  it('still says what it is armed with, above the button', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const armed = screen.getByTestId('play-now-armed');
    expect(armed.textContent).toContain('Unit 4 verbs');
    expect(order(armed, screen.getByTestId('play-now-go'))).toBe(-1);
  });

  it('labels the section below the button as a way to change the words', () => {
    render(<PlayNowLauncher onLaunch={vi.fn()} />);
    const change = screen.getByTestId('play-now-change');
    expect(order(screen.getByTestId('play-now-go'), change)).toBe(-1);
  });
});
