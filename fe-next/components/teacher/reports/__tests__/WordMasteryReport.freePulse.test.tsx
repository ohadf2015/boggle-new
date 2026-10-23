import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import { buildClassMastery } from '@/lib/education/wordMasteryTrend';
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
vi.mock('@/lib/supabase/education/classrooms', () => ({ getClassroomStudents: vi.fn() }));

import { WordMasteryReport } from '../WordMasteryReport';

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`);
const previewFor = (n: number) =>
  toFreePreview(
    buildWordMasteryReport(
      buildClassMastery(
        ['a', 'b'].map((studentId) => ({
          studentId,
          startedAt: '2026-09-01T10:00:00Z',
          results: { gameCode: 'G', lessonWordsAsked: words(n), lessonWordsFound: [] },
        })),
      ),
    ),
  );

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => vi.unstubAllGlobals());

function renderWith(status: number, body: unknown) {
  fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
  render(<WordMasteryReport classroomId="c1" classroomName="7A" />);
}

const heading = async () => (await screen.findByTestId('word-mastery-report')).querySelector('h2') as HTMLElement;

describe('WordMasteryReport: the class pulse summary is free', () => {
  it('Given a free teacher with games, Then the pulse heading carries no PRO lock and the summary shows', async () => {
    renderWith(402, { ok: false, locked: true, preview: previewFor(8) });
    await screen.findByTestId('mastery-locked-teaser');
    expect(await heading()).not.toHaveTextContent('eduPro.mastery.proBadge');
    expect(within(await heading()).queryByTestId('mastery-pro-badge')).toBeNull();
  });

  it('Given a free teacher with no games yet, Then the empty pulse is not dressed as a Pro lock', async () => {
    renderWith(402, { ok: false, locked: true, preview: previewFor(0) });
    await screen.findByText('eg2Rep.report.empty.title');
    expect(await heading()).not.toHaveTextContent('eduPro.mastery.proBadge');
  });

  it('Given a Pro teacher, Then the full report keeps its PRO badge', async () => {
    const report = buildWordMasteryReport(
      buildClassMastery([{ studentId: 'a', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G', lessonWordsAsked: words(4), lessonWordsFound: [] } }]),
    );
    renderWith(200, { ok: true, locked: false, report, insights: null });
    await waitFor(async () => expect(await heading()).toHaveTextContent('eduPro.mastery.proBadge'));
  });
});
