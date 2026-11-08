// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

const speakWord = vi.fn(async () => true);
vi.mock('@/lib/speech/textToSpeech', () => ({ speakWord: (...a: unknown[]) => speakWord(...(a as [])), cancelSpeech: vi.fn() }));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));

import { SpellTilesPractice, type SpellLabels } from '../_components/SpellTilesPractice';

const labels: SpellLabels = {
  welcomeTitle: 'Ready to spell?',
  welcomeBody: 'Listen, then tap the letters.',
  wordCount: '{count} words',
  start: 'Start',
  hear: 'Hear the word',
  peek: 'Show the word',
  noVoice: 'No voice here.',
  listen: 'Listen, then spell',
  erase: 'Erase a letter',
  correct: 'Perfect!',
  wrong: 'Keep going!',
  shown: 'Here is the word.',
  stars: 'Stars',
  progress: 'Word {n} of {total}',
  endTitle: 'List done!',
  endAccuracy: '{correct} of {total} right first time',
  endStars: 'Stars earned: {stars}',
  cheerTop: 'Amazing!',
  cheerMid: 'Great practice!',
  cheerLow: 'Nice effort!',
  again: 'Practice again',
  close: 'Close',
  teacherTitle: 'Teaching this list?',
  teacherBody: 'Play it live.',
  teacherCta: 'Play it with your class',
};

function setVoices(langs: string[]) {
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => langs.map((lang) => ({ lang })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      cancel: vi.fn(),
    },
  });
}

const firstOnly = () => 0;

function renderPractice(over: Partial<Parameters<typeof SpellTilesPractice>[0]> = {}) {
  const onClose = vi.fn();
  const utils = render(
    <SpellTilesPractice
      locale="en"
      title="Brave words"
      lang="en"
      words={[
        { word: 'cat', definition: 'A small pet' },
        { word: 'dog', definition: 'Barks' },
      ]}
      labels={labels}
      teacherCta={{ href: '/en/education/access?from=x' }}
      onClose={onClose}
      rand={firstOnly}
      {...over}
    />,
  );
  return { ...utils, onClose };
}

const freeTile = (c: string) =>
  [...document.querySelectorAll<HTMLButtonElement>(`[data-tile][data-char="${c}"]`)].find((b) => !b.disabled)!;
const spell = (word: string) => {
  for (const c of word) fireEvent.click(freeTile(c));
};
const slots = () => [...document.querySelectorAll<HTMLElement>('[data-slot]')];
const start = () => fireEvent.click(screen.getByRole('button', { name: 'Start' }));

beforeEach(() => {
  vi.useFakeTimers();
  speakWord.mockClear();
  track.mockClear();
  setVoices(['en-US', 'he-IL']);
});
afterEach(() => vi.useRealTimers());

describe('SpellTilesPractice', () => {
  it('Given the welcome card, When Start is tapped, Then word 1 is read aloud with tiles to spell it and the start is tracked', () => {
    renderPractice();
    expect(screen.getByText('Ready to spell?')).toBeTruthy();
    expect(screen.getByText('2 words')).toBeTruthy();
    start();
    expect(slots()).toHaveLength(3);
    expect(document.querySelectorAll('[data-tile]')).toHaveLength(3);
    expect(speakWord).toHaveBeenCalledWith('cat', 'en-US');
    expect(screen.getByRole('button', { name: 'Hear the word' })).toBeTruthy();
    expect(screen.getByText('A small pet')).toBeTruthy();
    expect(track).toHaveBeenCalledWith('landing_cta_clicked', expect.objectContaining({ cta: 'word_list_practice_started' }));
  });

  it('Given a wrong spelling, When the last tile lands, Then each letter is marked, the word stays, stars do not drop, and the tiles reset for a retry', () => {
    renderPractice();
    start();
    spell('act');
    expect(slots().map((s) => s.dataset.mark)).toEqual(['wrong', 'wrong', 'right']);
    expect(screen.getByText('Keep going!')).toBeTruthy();
    expect(document.querySelector('[data-stars]')?.textContent).toBe('0');
    act(() => vi.advanceTimersByTime(2000));
    expect(slots().every((s) => !s.dataset.mark && !s.textContent)).toBe(true);
    expect(screen.getByText('Word 1 of 2')).toBeTruthy();
  });

  it('Given a wrong spelling, When the fresh slots come back, Then the marked attempt stays above them until the word is spelled', () => {
    renderPractice();
    start();
    spell('act');
    act(() => vi.advanceTimersByTime(2000));
    const tried = () => [...document.querySelectorAll<HTMLElement>('[data-last-try] [data-mark]')];
    expect(tried().map((t) => `${t.textContent}:${t.dataset.mark}`)).toEqual(['a:wrong', 'c:wrong', 't:right']);
    spell('cat');
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText('Word 2 of 2')).toBeTruthy();
    expect(document.querySelector('[data-last-try]')).toBeNull();
  });

  it('Given two misses, When the tiles reset, Then the word itself is shown as a no-fail hint', () => {
    renderPractice();
    start();
    act(() => vi.advanceTimersByTime(3000));
    spell('act');
    act(() => vi.advanceTimersByTime(2000));
    spell('tac');
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText('Here is the word.')).toBeTruthy();
    expect(document.querySelector('[data-reveal]')?.textContent).toBe('cat');
  });

  it('Given a correct spelling, When the last tile lands, Then it says so, adds stars and moves to the next word', () => {
    renderPractice();
    start();
    spell('cat');
    expect(screen.getByText('Perfect!')).toBeTruthy();
    expect(document.querySelector('[data-stars]')?.textContent).toBe('3');
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText('Word 2 of 2')).toBeTruthy();
    expect(speakWord).toHaveBeenLastCalledWith('dog', 'en-US');
  });

  it('Given a list finished with one miss, When the end card shows, Then it gives first-try accuracy and a teacher link with no sign-up wall or price', () => {
    renderPractice();
    start();
    spell('act');
    act(() => vi.advanceTimersByTime(2000));
    spell('cat');
    act(() => vi.advanceTimersByTime(1500));
    spell('dog');
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.getByText('List done!')).toBeTruthy();
    expect(screen.getByText('1 of 2 right first time')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    const cta = screen.getByRole('link', { name: 'Play it with your class' });
    expect(cta.getAttribute('href')).toBe('/en/education/access?from=x');
    expect(document.body.textContent).not.toMatch(/\$|upgrade|pro\b/i);
    expect(track).toHaveBeenCalledWith('landing_cta_clicked', expect.objectContaining({ cta: 'word_list_practice_finished', accuracy: 50 }));
    fireEvent.click(screen.getByRole('button', { name: 'Practice again' }));
    expect(screen.getByText('Word 1 of 2')).toBeTruthy();
  });

  it('Given keyboard typing, When letters and Backspace are pressed, Then tiles fill and empty the slots', () => {
    renderPractice();
    start();
    fireEvent.keyDown(window, { key: 'c' });
    fireEvent.keyDown(window, { key: 'A' });
    expect(slots().map((s) => s.textContent)).toEqual(['c', 'a', '']);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(slots().map((s) => s.textContent)).toEqual(['c', '', '']);
  });

  it('Given a Hebrew list, When played on an English page, Then the slot row runs right to left; an English list on a Hebrew page stays left to right', () => {
    const { unmount } = renderPractice({ lang: 'he', words: [{ word: 'שלום', definition: 'ברכה' }] });
    start();
    expect(document.querySelector('[data-slot-row]')?.getAttribute('dir')).toBe('rtl');
    expect(document.querySelector('[data-slot-row]')?.getAttribute('lang')).toBe('he');
    unmount();
    renderPractice({ locale: 'he' });
    start();
    expect(document.querySelector('[data-slot-row]')?.getAttribute('dir')).toBe('ltr');
  });

  it('Given a device with no voice for the list language, When a word starts, Then the word is shown to read and the hear button is gone', () => {
    setVoices([]);
    renderPractice();
    start();
    expect(speakWord).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Hear the word' })).toBeNull();
    expect(screen.getByText('No voice here.')).toBeTruthy();
    expect(document.querySelector('[data-reveal]')?.textContent).toBe('cat');
  });

  it('Given a Japanese kana list, When played, Then each kana is its own tile', () => {
    setVoices(['ja-JP']);
    renderPractice({ lang: 'ja', words: [{ word: 'しゅくだい', definition: '家で やる 勉強' }] });
    start();
    expect([...document.querySelectorAll<HTMLElement>('[data-tile]')].map((t) => t.dataset.char).sort()).toEqual(
      [...'しゅくだい'].sort(),
    );
    spell('しゅくだい');
    expect(screen.getByText('Perfect!')).toBeTruthy();
  });

  it('Given a phrase, When played, Then the space is a fixed gap and not a tile', () => {
    renderPractice({ words: [{ word: 'ice cream', definition: '' }] });
    start();
    expect(document.querySelectorAll('[data-tile]')).toHaveLength(8);
    expect(document.querySelectorAll('[data-slot]')).toHaveLength(8);
  });
});
