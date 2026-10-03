import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));

import { WordMasteryReport } from '../WordMasteryReport';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const WORDS = ['bridge', 'castle', 'crystal', 'dragon', 'eagle'];
const MASTERY = buildClassMastery([
  { studentId: 's1', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G', lessonWordsAsked: WORDS, lessonWordsFound: [] } },
  { studentId: 's2', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G', lessonWordsAsked: WORDS, lessonWordsFound: ['eagle'] } },
]);
const REPORT = buildWordMasteryReport(MASTERY);

function respond(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  getClassroomStudents.mockResolvedValue({
    data: [
      { student_id: 's1', profiles: { display_name: 'Zoe', username: null } },
      { student_id: 's2', profiles: { display_name: 'Avi', username: null } },
    ],
  });
});
afterEach(() => vi.unstubAllGlobals());

const renderReport = () => render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);

describe('WordMasteryReport — Pro', () => {
  beforeEach(() => fetchMock.mockImplementation(() => respond(200, { ok: true, locked: false, report: REPORT })));

  it('leads with summary cards, then the ranked hardest words with raw counts', async () => {
    renderReport();
    expect(await screen.findByTestId('mastery-stat-accuracy')).toBeInTheDocument();
    const list = await screen.findByTestId('mastery-hardest-list');
    const rows = within(list).getAllByTestId('mastery-hardest-row');
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain('bridge');
    expect(rows[0].textContent).toContain('eduPro.mastery.missedOf:2,2');
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/education/classroom/${CLASSROOM}/word-mastery`);
  });

  it('keeps the student x word heatmap behind a disclosure, inside a horizontal scroll container', async () => {
    renderReport();
    const toggle = await screen.findByText('eduPro.mastery.heatmapToggle');
    expect(toggle.closest('details')).not.toBeNull();
    const scroller = screen.getByTestId('mastery-heatmap-scroll');
    expect(scroller.className).toContain('overflow-x-auto');
    expect(await screen.findByText('Zoe')).toBeInTheDocument();
    expect(screen.getAllByTestId('mastery-heatmap-cell').length).toBe(2 * 5);
  });

  it('assigns spaced rounds in one click and confirms with the three due days', async () => {
    renderReport();
    const cta = await screen.findByRole('button', { name: /eduPro.practice.cta/ });
    fetchMock.mockImplementationOnce(() =>
      respond(200, {
        ok: true,
        words: ['bridge', 'castle'],
        rounds: [
          { lessonId: 'L1', dueDate: '2026-10-02' },
          { lessonId: 'L2', dueDate: '2026-10-04' },
          { lessonId: 'L3', dueDate: '2026-10-08' },
        ],
      }),
    );
    fireEvent.click(cta);
    expect(await screen.findByTestId('missed-practice-assigned')).toBeInTheDocument();
    expect(screen.getAllByTestId('missed-practice-round')).toHaveLength(3);
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    expect(url).toBe(`/api/education/classroom/${CLASSROOM}/missed-practice`);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.names).toHaveLength(3);
  });

  it('says so when the rounds were already assigned today', async () => {
    renderReport();
    const cta = await screen.findByRole('button', { name: /eduPro.practice.cta/ });
    fetchMock.mockImplementationOnce(() => respond(409, { ok: false, error: 'already_assigned' }));
    fireEvent.click(cta);
    expect(await screen.findByText('eduPro.practice.already')).toBeInTheDocument();
  });

  it('reports a failed assign instead of pretending', async () => {
    renderReport();
    const cta = await screen.findByRole('button', { name: /eduPro.practice.cta/ });
    fetchMock.mockImplementationOnce(() => respond(500, { ok: false }));
    fireEvent.click(cta);
    expect(await screen.findByRole('alert')).toHaveTextContent('eduPro.practice.failed');
  });
});

describe('WordMasteryReport — long lists', () => {
  it('shows six hardest words first and the rest on demand', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => `w${i}`);
    const report = buildWordMasteryReport(
      buildClassMastery([
        { studentId: 'a', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G', lessonWordsAsked: ten, lessonWordsFound: [] } },
        { studentId: 'b', startedAt: '2026-09-01T10:00:00Z', results: { gameCode: 'G', lessonWordsAsked: ten, lessonWordsFound: [] } },
      ]),
    );
    fetchMock.mockImplementation(() => respond(200, { ok: true, locked: false, report }));
    renderReport();
    expect(await screen.findAllByTestId('mastery-hardest-row')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: /eduPro.mastery.showAll:10/ }));
    expect(screen.getAllByTestId('mastery-hardest-row')).toHaveLength(10);
  });
});

describe('WordMasteryReport — free preview', () => {
  beforeEach(() =>
    fetchMock.mockImplementation(() => respond(402, { ok: false, error: 'Teacher Pro required', locked: true, preview: toFreePreview(REPORT) })),
  );

  it('shows the real top 3 and upsells the rest, with no per-student data', async () => {
    renderReport();
    const rows = await screen.findAllByTestId('mastery-hardest-row');
    expect(rows).toHaveLength(3);
    expect(screen.getByText('eduPro.mastery.hiddenWords:2')).toBeInTheDocument();
    expect(screen.queryByTestId('mastery-heatmap-cell')).not.toBeInTheDocument();
    expect(screen.getByText('teacher.proGate.mastery.title')).toBeInTheDocument();
    const upgrade = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/en/teacher/upgrade');
    expect(upgrade.length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /eduPro.practice.cta/ })).not.toBeInTheDocument();
  });
});

describe('WordMasteryReport — states', () => {
  it('shows the first-game empty state when nothing was asked yet', async () => {
    fetchMock.mockImplementation(() =>
      respond(200, { ok: true, locked: false, report: buildWordMasteryReport(buildClassMastery([])) }),
    );
    renderReport();
    expect(await screen.findByText('eduPro.mastery.empty')).toBeInTheDocument();
  });

  it('shows an error, not a blank card, when the report fails', async () => {
    fetchMock.mockImplementation(() => respond(500, { ok: false }));
    renderReport();
    expect(await screen.findByText('eduPro.mastery.error')).toBeInTheDocument();
  });

  it('holds a skeleton while loading', () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    renderReport();
    expect(screen.getByTestId('word-mastery-loading')).toBeInTheDocument();
  });
});

describe('the Pro CTA sits behind Pro on the server too', () => {
  it('is wired to the 402-guarded route, not a client-side lesson insert', async () => {
    const src = (await import('fs')).readFileSync(
      (await import('path')).join(__dirname, '../MissedPracticeAction.tsx'),
      'utf8',
    );
    expect(src).toContain('/missed-practice');
    expect(src).not.toContain('createLesson');
  });
});

