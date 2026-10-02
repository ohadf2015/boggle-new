import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

function renderLocked(n: number) {
  fetchMock.mockImplementation(() =>
    Promise.resolve(new Response(JSON.stringify({ ok: false, locked: true, preview: previewFor(n) }), { status: 402 })),
  );
  render(<WordMasteryReport classroomId="c1" classroomName="7A" />);
}

describe('WordMasteryReport — locked teaser', () => {
  it('continues the ranked list with blurred rows numbered after the free top 3', async () => {
    renderLocked(8);
    const teaser = await screen.findByTestId('mastery-locked-teaser');
    const ghosts = within(teaser).getAllByTestId('mastery-ghost-row');
    expect(ghosts).toHaveLength(3);
    expect(ghosts.map((g) => g.textContent)).toEqual(['4', '5', '6']);
    expect(ghosts[0].closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('never shows more ghost rows than words Pro actually holds', async () => {
    renderLocked(4);
    const teaser = await screen.findByTestId('mastery-locked-teaser');
    expect(within(teaser).getAllByTestId('mastery-ghost-row')).toHaveLength(1);
  });

  it('puts the call to action below the blur, not over it, with one upgrade link and what Pro unlocks', async () => {
    renderLocked(8);
    const teaser = await screen.findByTestId('mastery-locked-teaser');
    const panel = within(teaser).getByTestId('mastery-unlock-panel');
    expect(panel.className).not.toMatch(/\babsolute\b/);
    expect(within(panel).getAllByTestId('mastery-unlock-item').map((i) => i.textContent)).toEqual([
      'eduPro.mastery.unlock.allWords',
      'eduPro.mastery.unlock.heatmap',
      'eduPro.mastery.unlock.practice',
    ]);
    const links = within(teaser).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/en/teacher/upgrade');
  });

  it('gives the whole locked report a single upgrade call to action', async () => {
    renderLocked(8);
    const report = await screen.findByTestId('word-mastery-report');
    await screen.findByTestId('mastery-locked-teaser');
    const upgrade = within(report).getAllByRole('link').filter((a) => a.getAttribute('href') === '/en/teacher/upgrade');
    expect(upgrade).toHaveLength(1);
  });
});
