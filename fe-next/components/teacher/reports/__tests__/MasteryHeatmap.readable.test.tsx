import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { buildClassMastery } from '@/lib/education/wordMasteryTrend';
import { buildWordMasteryReport } from '@/lib/education/wordMasteryReport';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));

import { MasteryHeatmap } from '../MasteryHeatmap';

const WORDS = ['bridge', 'castle', 'eagle', 'river', 'window', 'apple', 'candle', 'mirror'];
const session = (studentId: string, found: string[]) => ({
  studentId,
  startedAt: '2026-09-01T10:00:00Z',
  results: { gameCode: 'G', lessonWordsAsked: WORDS, lessonWordsFound: found },
});
const REPORT = buildWordMasteryReport(
  buildClassMastery([session('s1', []), session('s2', ['eagle', 'river', 'window']), session('s3', WORDS)]),
);
const NAMES = { s1: 'Zoe Adler', s2: 'Avi Ben', s3: 'Noa Katz' };

const renderMap = () => render(<MasteryHeatmap report={REPORT} names={NAMES} />);

describe('MasteryHeatmap — desktop grid', () => {
  it('fills the card width and labels rows with first names, full name on hover', () => {
    renderMap();
    const table = screen.getByRole('table');
    expect(table.className).toContain('w-full');
    const row = within(table).getByRole('rowheader', { name: /Zoe/ });
    expect(row.textContent).not.toContain('Adler');
    expect(row.querySelector('[title="Zoe Adler"]')).not.toBeNull();
  });

  it('shows how many words each student needs help with, most first', () => {
    renderMap();
    const counts = screen.getAllByTestId('mastery-needs-help').map((n) => n.textContent);
    expect(counts).toEqual(['8', '5', '0']);
  });

  it('ends each word column with an N of M missed footer', () => {
    renderMap();
    const footers = screen.getAllByTestId('mastery-word-missed');
    expect(footers).toHaveLength(WORDS.length);
    expect(footers[0].textContent).toBe('2/3');
    expect(footers.at(-1)!.textContent).toBe('1/3');
  });

  it('marks cells with a shape, not only a colour or a bare fraction', () => {
    renderMap();
    const cells = screen.getAllByTestId('mastery-heatmap-cell');
    expect(cells).toHaveLength(3 * WORDS.length);
    for (const cell of cells) {
      expect(cell.querySelector('svg')).not.toBeNull();
      expect(cell.textContent ?? '').not.toMatch(/\d+\/\d+/);
    }
    const legend = screen.getByTestId('mastery-legend');
    expect(legend.querySelectorAll('svg').length).toBe(4);
  });
});

describe('MasteryHeatmap — phone list', () => {
  it('lists every word as a card with who missed it, so nothing scrolls out of view', () => {
    renderMap();
    const list = screen.getByTestId('mastery-word-cards');
    expect(list.className).toContain('sm:hidden');
    expect(screen.getByTestId('mastery-heatmap-scroll').parentElement!.className).toContain('hidden sm:block');
    const cards = within(list).getAllByTestId('mastery-word-card');
    expect(cards).toHaveLength(WORDS.length);
    expect(cards[0].textContent).toContain('eduPro.mastery.missedByCount:2,3');
    expect(cards[0].textContent).toContain('eduPro.mastery.missedNames:Zoe and Avi');
    expect(cards.at(-1)!.textContent).toContain('eduPro.mastery.missedNames:Zoe');
  });

  it('opens with the reteach list: who needs help and on how many words', () => {
    renderMap();
    const chips = within(screen.getByTestId('mastery-needs-help-list')).getAllByRole('listitem');
    expect(chips.map((c) => c.textContent)).toEqual(['eduPro.mastery.needsHelpChip:Zoe,8', 'eduPro.mastery.needsHelpChip:Avi,5']);
  });
});

describe('MasteryHeatmap — shaky students', () => {
  const two = (studentId: string, first: string[], second: string[]) => [
    { studentId, startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G1', lessonWordsAsked: ['bridge', 'castle'], lessonWordsFound: first } },
    { studentId, startedAt: '2026-09-02T10:00:00Z', results: { gameCode: 'G2', lessonWordsAsked: ['bridge', 'castle'], lessonWordsFound: second } },
  ];
  const report = buildWordMasteryReport(
    buildClassMastery([...two('s1', [], []), ...two('s2', ['bridge'], []), ...two('s3', ['bridge', 'castle'], ['bridge', 'castle'])]),
  );

  it('counts shaky students in the footer so it matches the hardest-words student count', () => {
    render(<MasteryHeatmap report={report} names={NAMES} />);
    const bridge = report.hardestWords.find((w) => w.word === 'bridge')!;
    expect(bridge.studentsMissing).toBe(2);
    const footer = screen.getAllByTestId('mastery-word-missed').find((f) => f.getAttribute('aria-label')?.includes('bridge'))!;
    expect(footer.textContent).toBe(`${bridge.studentsMissing}/${bridge.studentsAsked}`);
    expect(screen.getAllByTestId('mastery-heatmap-cell').some((c) => c.getAttribute('data-tone') === 'shaky')).toBe(true);
  });

  it('splits the phone card into missed and shaky names under one total', () => {
    render(<MasteryHeatmap report={report} names={NAMES} />);
    const card = screen.getAllByTestId('mastery-word-card').find((c) => c.textContent?.includes('bridge'))!;
    expect(card.textContent).toContain('eduPro.mastery.missedByCount:2,3');
    expect(card.textContent).toContain('eduPro.mastery.missedNames:Zoe');
    expect(card.textContent).toContain('eduPro.mastery.shakyNames:Avi');
  });
});

