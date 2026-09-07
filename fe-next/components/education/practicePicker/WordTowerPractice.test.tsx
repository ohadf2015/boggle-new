/**
 * WordTowerPractice — the lesson-seeded Word Tower run.
 *
 * The wrapper's whole job is the seam between the lesson and the game: deal a
 * wheel made of the lesson's letters, mark a lesson word when it is placed, and
 * hand the hits back to the practice session. The tower's own mechanics are
 * covered by the Word Tower suites, so these tests drive the REAL wheel
 * component (via its `data-wheel-letter` tiles) and assert only the seam.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WordTowerPractice from './WordTowerPractice';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.values(params).join(',')})` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// The real loader fetches a multi-megabyte word list. The seam under test is
// "was this word in the lesson?", so a tiny dictionary is enough — and it must
// contain a non-lesson word, or the test could not tell a hit from any accept.
vi.mock('@/lib/word-craft/dictionary', () => ({
  loadWordCraftDictionary: vi.fn(async () => new Set(['LIGHT', 'NIGHT', 'SIGHT', 'THIN', 'TIN'])),
}));

const LESSON = ['light', 'night', 'sight', 'bright'];

const onComplete = vi.fn();
const onBack = vi.fn();

beforeEach(() => {
  onComplete.mockReset();
  onBack.mockReset();
});

const renderIt = (words = LESSON) =>
  render(<WordTowerPractice words={words} language="en" onComplete={onComplete} onBack={onBack} />);

const tiles = () => Array.from(document.querySelectorAll('[data-wheel-letter]'));

/** Spell a word by tapping its letters on the real wheel, then tap BUILD. */
async function spell(word: string) {
  await waitFor(() => expect(tiles().length).toBeGreaterThan(0));
  const ring = tiles();
  const used = new Set<number>();
  for (const ch of word) {
    const idx = ring.findIndex(
      (el, i) => !used.has(i) && el.getAttribute('data-wheel-letter')?.toUpperCase() === ch
    );
    if (idx === -1) throw new Error(`no free '${ch}' tile on the wheel for ${word}`);
    used.add(idx);
    fireEvent.click(ring[idx]);
  }
  fireEvent.click(await screen.findByLabelText('wordTower.hud.build'));
}

describe('WordTowerPractice', () => {
  it('deals a full wheel built from the lesson letters', async () => {
    renderIt();
    await waitFor(() => expect(tiles()).toHaveLength(7));
    const letters = tiles().map((el) => el.getAttribute('data-wheel-letter'));
    // LIGHT / NIGHT / SIGHT overlap on L,I,G,H,T — the ring is their union.
    for (const ch of ['L', 'I', 'G', 'H', 'T', 'N', 'S']) expect(letters).toContain(ch);
  });

  it('shows the lesson words as a checklist to build', async () => {
    renderIt();
    expect(await screen.findByTestId('word-tower-practice-target-LIGHT')).toBeTruthy();
  });

  it('marks a lesson word as hit once it is placed', async () => {
    renderIt();
    await spell('LIGHT');
    await waitFor(() =>
      expect(screen.getByTestId('word-tower-practice-target-LIGHT').getAttribute('data-hit')).toBe(
        'true'
      )
    );
  });

  it('does not mark a hit for an ordinary dictionary word', async () => {
    renderIt();
    await spell('THIN');
    // The floor MUST have landed, or this test would pass for the wrong reason:
    // a silently rejected word also leaves the hit count at zero.
    await waitFor(() =>
      expect(screen.getByTestId('word-tower-practice-floors').getAttribute('data-floors')).toBe('1')
    );
    expect(screen.getByTestId('word-tower-practice-hits').getAttribute('data-count')).toBe('0');
    expect(screen.getByTestId('word-tower-practice-target-LIGHT').getAttribute('data-hit')).toBe(
      'false'
    );
  });

  it('reports the lesson words found when the student finishes', async () => {
    renderIt();
    await spell('LIGHT');
    await waitFor(() =>
      expect(screen.getByTestId('word-tower-practice-target-LIGHT').getAttribute('data-hit')).toBe(
        'true'
      )
    );
    fireEvent.click(screen.getByTestId('word-tower-practice-done'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0].vocabularyWordsFound).toEqual(['LIGHT']);
  });

  it('reports nothing found when the student leaves without building', async () => {
    renderIt();
    await waitFor(() => expect(tiles().length).toBeGreaterThan(0));
    fireEvent.click(screen.getByTestId('word-tower-practice-done'));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete.mock.calls[0][0].vocabularyWordsFound).toEqual([]);
  });

  it('tells the student the lesson cannot seed a wheel instead of dealing an empty one', async () => {
    renderIt(['cat', 'dog']);
    expect(await screen.findByTestId('word-tower-practice-unavailable')).toBeTruthy();
    expect(tiles()).toHaveLength(0);
  });
});
