/**
 * Renders the report with the REAL locale dictionaries instead of a
 * key-echoing stub.
 *
 * Every other test here mocks `t` as the identity function, which proves the
 * wiring but would happily pass while a teacher stares at
 * `teacher.classReport.title` on screen — the exact bug this repo has shipped
 * before (the cookie banner rendered raw key paths on `/en`). This test walks
 * the rendered DOM and fails on any surviving key path, in English and in
 * Hebrew.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect } from 'vitest';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { en } from '../../../../translations/en.js';
import { he } from '../../../../translations/he.js';

type Dict = Record<string, unknown>;

let activeDict: Dict = en as Dict;
let activeLanguage = 'en';

/** Minimal stand-in for the real `t`: dotted lookup plus {var} substitution. */
function translate(key: string, _fallback?: string, params?: Record<string, string>): string {
  const value = key
    .split('.')
    .reduce<unknown>((acc, part) => (acc && typeof acc === 'object' ? (acc as Dict)[part] : undefined), activeDict);
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{\{?(\w+)\}?\}/g, (match, name) => params[name] ?? match);
}

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: translate,
    language: activeLanguage,
    dir: activeLanguage === 'he' ? 'rtl' : 'ltr',
  }),
}));

const RAW_KEY = /teacher\.(classReport|lastGame)\.[A-Za-z0-9_.]+/;

function game(over: Partial<RecentClassroomGame> = {}): RecentClassroomGame {
  return {
    gameCode: 'G2',
    gameMode: 'classic',
    playedAt: '2026-09-04T10:00:00Z',
    lessonIds: ['lesson-1'],
    players: [
      {
        studentId: 's1',
        name: 'Alice',
        score: 120,
        lessonWordsFound: ['cat', 'dog'],
        lessonWordsMissed: ['fox'],
        accuracyPct: 67,
      },
      {
        studentId: 's2',
        name: 'Bob',
        score: 60,
        lessonWordsFound: ['cat'],
        lessonWordsMissed: ['dog', 'fox'],
        accuracyPct: 33,
      },
    ],
    missedWords: [
      { word: 'fox', missedBy: 2, total: 2, pct: 100 },
      { word: 'dog', missedBy: 1, total: 2, pct: 50 },
      { word: 'cat', missedBy: 0, total: 2, pct: 0 },
    ],
    totalLessonWords: 3,
    wordsNobodyFound: ['fox'],
    coveragePct: 67,
    averageAccuracyPct: 50,
    participation: { played: 2, roster: 3 },
    absentStudents: [{ studentId: 's3', name: 'Cleo' }],
    ...over,
  };
}

async function importSection() {
  const mod = await import('../ClassReportSection');
  return mod.ClassReportSection;
}

describe.each([
  ['en', en as Dict],
  ['he', he as Dict],
])('class report rendered in %s', (locale, dict) => {
  it('shows translated copy, never a raw key path', async () => {
    activeDict = dict;
    activeLanguage = locale;
    const ClassReportSection = await importSection();

    const { container } = render(
      <ClassReportSection game={game({ gameMode: 'vocab-quiz' })} games={[game()]} />
    );

    // Open the drill-down so its copy is on screen too.
    fireEvent.click(screen.getAllByTestId('report-student-header')[1]);

    const text = container.textContent ?? '';
    expect(text).not.toMatch(RAW_KEY);
    expect(container.querySelectorAll('[aria-label]').length).toBeGreaterThan(0);
    for (const el of container.querySelectorAll('[aria-label]')) {
      expect(el.getAttribute('aria-label') ?? '').not.toMatch(RAW_KEY);
    }
  });

  it('renders the empty state in %s without a raw key', async () => {
    activeDict = dict;
    activeLanguage = locale;
    const ClassReportSection = await importSection();

    const { container } = render(
      <ClassReportSection
        game={game({ players: [], missedWords: [], absentStudents: [] })}
        games={[]}
      />
    );

    expect(screen.getByTestId('report-empty')).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(RAW_KEY);
  });

  it('copies a summary with no raw key in it', async () => {
    activeDict = dict;
    activeLanguage = locale;
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const ClassReportSection = await importSection();

    render(<ClassReportSection game={game()} games={[game()]} />);
    fireEvent.click(screen.getByTestId('report-copy'));

    const text = writeText.mock.calls[0][0] as string;
    expect(text).not.toMatch(RAW_KEY);
    expect(text).toContain('fox');
    expect(text).toContain('Cleo');
  });
});

describe('layout safety', () => {
  it('uses no physical left/right offsets that would break under RTL', async () => {
    activeDict = en as Dict;
    activeLanguage = 'en';
    const ClassReportSection = await importSection();

    const { container } = render(<ClassReportSection game={game()} games={[game()]} />);

    const classes = [...container.querySelectorAll('*')]
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ');
    expect(classes).not.toMatch(/\b(left-0|right-0|text-left|text-right|ml-|mr-|pl-|pr-)/);
  });
});
