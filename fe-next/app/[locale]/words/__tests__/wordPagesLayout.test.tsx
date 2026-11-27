import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';

vi.mock('@/components/ads', () => ({ InlineBannerAd: () => null }));
vi.mock('@/components/navigation/TopBackLink', () => ({ TopBackLink: () => null }));
vi.mock('@/components/Header', () => ({ default: () => null }));

import WordExplorerPage from '../[word]/page';
import StartingWithLetterPage from '../starting-with/[letter]/page';
import WordsHubPage from '../page';
import { NLetterWordsView } from '../_nletter/NLetterWordsView';
import { LETTER_CONTENT } from '../starting-with/[letter]/letterContent';
import { PressGroup } from '../_components/PressGroup';
import { VALID_LETTERS } from '../_utils/wordListData';

const params = <T,>(p: T) => ({ params: Promise.resolve(p) });

function precedes(a: Element, b: Element) {
  return Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function textNode(container: HTMLElement, text: string): Element {
  const el = [...container.querySelectorAll('p, h2, a, span')].find((e) => e.textContent?.includes(text));
  if (!el) throw new Error(`no element with "${text}"`);
  return el;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ isValid: true }) })));
});

describe('word pages: one primary CTA above the content, no hidden-at-load content', () => {
  it('word page puts its single quick-play CTA before the scoring block', async () => {
    const { container } = render((await WordExplorerPage(params({ locale: 'en', word: 'quiz' }))) as ReactElement);
    const primary = container.querySelectorAll('[data-primary-cta]');
    expect(primary).toHaveLength(1);
    expect(primary[0].getAttribute('href')).toBe('/en/quick-play');
    expect(precedes(primary[0], textNode(container, 'Scoring'))).toBe(true);
  });

  it('word page moves the Word Solver link below the word', async () => {
    const { container } = render((await WordExplorerPage(params({ locale: 'en', word: 'quiz' }))) as ReactElement);
    const solver = container.querySelector('a[href="/en/tools/word-solver"]');
    expect(solver).not.toBeNull();
    expect(precedes(container.querySelector('h1')!, solver!)).toBe(true);
  });

  it('starting-with page: one hero CTA, nothing starts at opacity 0, intro below the list', async () => {
    const { container } = render((await StartingWithLetterPage(params({ locale: 'en', letter: 's' }))) as ReactElement);
    const primary = container.querySelectorAll('[data-primary-cta]');
    expect(primary).toHaveLength(1);
    expect(primary[0].getAttribute('href')).toBe('/en/quick-play');
    expect(container.innerHTML).not.toMatch(/opacity:\s*0/);
    const firstWord = container.querySelector('a[href^="/en/words/s"]:not([href*="starting-with"])')!;
    expect(precedes(firstWord, textNode(container, LETTER_CONTENT.s.intro.slice(0, 30)))).toBe(true);
    expect(container.querySelector('a[href="/en/multiplayer"]')).not.toBeNull();
  });

  it('n-letter page: one hero CTA, strategy text below the word list', async () => {
    const { container } = render((await NLetterWordsView({ locale: 'en', n: 5 })) as ReactElement);
    const primary = container.querySelectorAll('[data-primary-cta]');
    expect(primary).toHaveLength(1);
    const firstWord = container.querySelector('[data-press][href^="/en/words/"]:not([href*="letter"])')!;
    expect(firstWord).not.toBeNull();
    expect(precedes(firstWord, textNode(container, 'Strategy for 5-Letter Words'))).toBe(true);
  });

  it('words hub: solver CTA in the hero, explainer copy after the browse grids', async () => {
    const { container } = render((await WordsHubPage(params({ locale: 'en' }))) as ReactElement);
    const primary = container.querySelectorAll('[data-primary-cta]');
    expect(primary).toHaveLength(1);
    expect(primary[0].getAttribute('href')).toBe('/en/tools/word-solver');
    expect(precedes(textNode(container, 'Browse by Starting Letter'), textNode(container, 'Welcome to the LexiClash word dictionary'))).toBe(true);
    expect(container.querySelectorAll('a[data-press][href*="/words/starting-with/"]')).toHaveLength(VALID_LETTERS.length);
  });
});

describe('PressGroup', () => {
  it('sinks the pressed [data-press] child and releases it', () => {
    const { getByText } = render(
      <PressGroup>
        <a data-press href="#x">chip</a>
      </PressGroup>,
    );
    const chip = getByText('chip');
    fireEvent.pointerDown(chip, { button: 0 });
    expect(chip.getAttribute('data-pressed')).toBe('true');
    fireEvent.pointerUp(chip);
    expect(chip.hasAttribute('data-pressed')).toBe(false);
    fireEvent.keyDown(chip, { key: 'Enter' });
    expect(chip.getAttribute('data-pressed')).toBe('true');
    fireEvent.keyUp(chip, { key: 'Enter' });
    expect(chip.hasAttribute('data-pressed')).toBe(false);
  });
});
