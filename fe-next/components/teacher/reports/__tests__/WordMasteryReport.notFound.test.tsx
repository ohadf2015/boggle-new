import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { buildClassMastery, type MasterySessionRow } from '@/lib/education/wordMasteryTrend';
import { buildWordMasteryReport, toFreePreview } from '@/lib/education/wordMasteryReport';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('@/utils/authFetch', () => ({
  getWithAuth: (url: string, init?: RequestInit) => fetch(url, init),
  fetchWithAuth: (url: string, init?: RequestInit) => fetch(url, init),
}));
vi.mock('@/lib/supabase/education/classrooms', () => ({ getClassroomStudents: vi.fn().mockResolvedValue({ data: [] }) }));

import { WordMasteryReport } from '../WordMasteryReport';

const board = (studentId: string, startedAt: string, missed: string[]): MasterySessionRow => ({
  studentId,
  startedAt,
  results: { gameCode: `B${startedAt}`, lessonWordsFound: [], lessonWordsMissed: missed },
});
const asked = (studentId: string, startedAt: string, words: string[]): MasterySessionRow => ({
  studentId,
  startedAt,
  results: { gameCode: `Q${startedAt}`, lessonWordsAsked: words, lessonWordsFound: [], lessonWordsMissed: words },
});

const BOARD_ONLY = [board('a', '2026-11-09T09:00:00Z', ['owl', 'fox']), board('b', '2026-11-09T09:00:00Z', ['owl', 'fox'])];
const BOTH = [...BOARD_ONLY, asked('a', '2026-11-08T09:00:00Z', ['moon']), asked('a', '2026-11-10T09:00:00Z', ['moon'])];

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => vi.unstubAllGlobals());

function renderWith(status: number, body: unknown) {
  fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
  render(<WordMasteryReport classroomId="c1" classroomName="7A" />);
}

describe('WordMasteryReport: words not found in board games', () => {
  it('Given a Pro class that only played board games, Then the report lists the words nobody found instead of the empty state', async () => {
    renderWith(200, { ok: true, locked: false, report: buildWordMasteryReport(buildClassMastery(BOARD_ONLY)), insights: null });
    const block = await screen.findByTestId('mastery-not-found');
    expect(within(block).getByText('eduPro.mastery.notFound.title')).toBeInTheDocument();
    expect(within(block).getByText('eduPro.mastery.notFound.note')).toBeInTheDocument();
    expect(within(block).getAllByTestId('mastery-hardest-row')).toHaveLength(2);
    expect(within(block).getAllByTestId('report-word-missrate')[0]).toHaveTextContent('eduPro.mastery.notFound.rate:100');
    expect(screen.queryByText('eg2Rep.report.empty.title')).toBeNull();
    expect(screen.queryByTestId('mastery-stat-accuracy')).toBeNull();
  });

  it('Given asked and board games, Then answered-wrong and not-found are two separate lists', async () => {
    renderWith(200, { ok: true, locked: false, report: buildWordMasteryReport(buildClassMastery(BOTH)), insights: null });
    const block = await screen.findByTestId('mastery-not-found');
    const lists = screen.getAllByTestId('mastery-hardest-list');
    expect(lists).toHaveLength(2);
    expect(within(lists[0]).getByText('moon')).toBeInTheDocument();
    expect(within(lists[0]).queryByText('owl')).toBeNull();
    expect(within(block).getByText('owl')).toBeInTheDocument();
    expect(within(block).queryByText('moon')).toBeNull();
  });

  it('Given a free teacher whose class only played board games, Then the preview shows those words, not the empty state', async () => {
    renderWith(402, { ok: false, locked: true, preview: toFreePreview(buildWordMasteryReport(buildClassMastery(BOARD_ONLY))) });
    const block = await screen.findByTestId('mastery-not-found');
    expect(within(block).getAllByTestId('mastery-hardest-row')).toHaveLength(2);
    expect(screen.queryByText('eg2Rep.report.empty.title')).toBeNull();
  });

  it('Given no games at all, Then the empty state still shows', async () => {
    renderWith(200, { ok: true, locked: false, report: buildWordMasteryReport(buildClassMastery([])), insights: null });
    expect(await screen.findByText('eg2Rep.report.empty.title')).toBeInTheDocument();
    expect(screen.queryByTestId('mastery-not-found')).toBeNull();
  });
});
