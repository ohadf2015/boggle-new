/**
 * Device-free printable practice sheet from class missed words (after Live).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildMissedWordsPracticeSheetHtml,
  normalizeMissedWordsForSheet,
  openMissedWordsPracticeSheet,
} from '../missedWordsPracticeSheet';

const labels = {
  title: 'Missed-words practice',
  subtitle: 'Device-free reteach — write each word, then use it in a sentence',
  writeLabel: 'Write the word',
  sentenceLabel: 'Use it in a sentence',
  nameLine: 'Name: ________________',
  dateLine: 'Date: ________________',
  footer: 'LexiClash · device-free practice',
};

describe('normalizeMissedWordsForSheet', () => {
  it('drops blanks, trims, dedupes case-insensitively, and caps at 12', () => {
    const words = [
      '  neutron ',
      'NEUTRON',
      '',
      'photon',
      ...Array.from({ length: 15 }, (_, i) => `w${i}`),
    ];
    const out = normalizeMissedWordsForSheet(words);
    expect(out[0]).toBe('neutron');
    expect(out).toContain('photon');
    expect(out.filter((w) => w.toLowerCase() === 'neutron')).toHaveLength(1);
    expect(out.length).toBeLessThanOrEqual(12);
  });
});

describe('buildMissedWordsPracticeSheetHtml', () => {
  it('returns null when there are no missed words', () => {
    expect(
      buildMissedWordsPracticeSheetHtml({
        lesson: 'Physics 101',
        missedWords: [],
        labels,
      }),
    ).toBeNull();
  });

  it('renders a print-ready sheet with lesson, words, and write/sentence lines', () => {
    const html = buildMissedWordsPracticeSheetHtml({
      lesson: 'Physics 101',
      teacher: 'Ms. Cohen',
      missedWords: ['neutron', 'quark'],
      locale: 'en',
      labels,
    });
    expect(html).toBeTruthy();
    expect(html!).toContain('data-testid="missed-words-practice-sheet"');
    expect(html!).toContain('Physics 101');
    expect(html!).toContain('Ms. Cohen');
    expect(html!).toContain('neutron');
    expect(html!).toContain('quark');
    expect(html!).toContain('Write the word');
    expect(html!).toContain('Use it in a sentence');
    expect(html!).toContain('window.print()');
    // Class-level only — never bake student names into the sheet from coverage.
    expect(html!).not.toContain('Maya');
    expect(html!).not.toContain('Noa');
  });

  it('escapes HTML in lesson / words so a crafted word cannot break the sheet', () => {
    const html = buildMissedWordsPracticeSheetHtml({
      lesson: '<script>alert(1)</script>',
      missedWords: ['<img src=x onerror=alert(1)>'],
      labels,
    });
    expect(html!).not.toContain('<script>alert(1)</script>');
    expect(html!).toContain('&lt;script&gt;');
    expect(html!).toContain('&lt;img');
  });

  it('marks Hebrew sheets rtl', () => {
    const html = buildMissedWordsPracticeSheetHtml({
      lesson: 'שיעור',
      missedWords: ['מילה'],
      locale: 'he',
      labels,
    });
    expect(html!).toContain('dir="rtl"');
    expect(html!).toContain('lang="he"');
  });
});

describe('openMissedWordsPracticeSheet', () => {
  const originalOpen = window.open;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('writes the sheet into a new window when the popup is allowed', () => {
    const doc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };
    const popup = { document: doc, close: vi.fn() };
    window.open = vi.fn().mockReturnValue(popup);

    const ok = openMissedWordsPracticeSheet({
      lesson: 'Physics 101',
      missedWords: ['neutron'],
      labels,
    });
    expect(ok).toBe(true);
    expect(window.open).toHaveBeenCalled();
    expect(doc.write).toHaveBeenCalled();
    const written = doc.write.mock.calls[0][0] as string;
    expect(written).toContain('neutron');
  });

  it('returns false when the popup is blocked', () => {
    window.open = vi.fn().mockReturnValue(null);
    expect(
      openMissedWordsPracticeSheet({
        lesson: 'Physics 101',
        missedWords: ['neutron'],
        labels,
      }),
    ).toBe(false);
  });

  it('returns false when there are no words to print', () => {
    window.open = vi.fn();
    expect(
      openMissedWordsPracticeSheet({
        lesson: 'Physics 101',
        missedWords: [],
        labels,
      }),
    ).toBe(false);
    expect(window.open).not.toHaveBeenCalled();
  });
});
