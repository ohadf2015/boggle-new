import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { buildClassMastery, type MasterySessionRow } from '@/lib/education/wordMasteryTrend';
import { buildWordMasteryReport } from '@/lib/education/wordMasteryReport';
import { buildClassInsights } from '../classInsights';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
vi.mock('../useCountUp', () => ({ useCountUp: (n: number) => n }));
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
const row = (s: string, at: string, asked: string[], found: string[]): MasterySessionRow => ({
  studentId: s,
  startedAt: at,
  results: { gameCode: 'ROOM', lessonWordsAsked: asked, lessonWordsFound: found },
});
const WORDS = ['castle', 'bridge', 'eagle'];
const MASTERY = buildClassMastery([
  row('maya', '2026-09-01T10:00:00Z', WORDS, WORDS),
  row('maya', '2026-09-01T10:05:00Z', WORDS, WORDS),
  row('sam', '2026-09-01T10:00:00Z', WORDS, []),
  row('sam', '2026-09-01T10:05:00Z', WORDS, ['eagle']),
]);
const REPORT = buildWordMasteryReport(MASTERY);
const INSIGHTS = buildClassInsights(MASTERY);

const respond = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockImplementation(() => respond(200, { ok: true, locked: false, report: REPORT, insights: INSIGHTS }));
  getClassroomStudents.mockResolvedValue({
    data: [
      { student_id: 'maya', profiles: { display_name: 'Maya R', username: null } },
      { student_id: 'sam', profiles: { display_name: 'Sam T', username: null } },
    ],
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('WordMasteryReport — who needs help', () => {
  it('opens on the students view, weakest first, with accuracy and the words each one misses', async () => {
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);
    const rows = await screen.findAllByTestId('report-student-row');
    expect(rows).toHaveLength(2);
    await waitFor(() => expect(rows[0].textContent).toContain('Sam T'));
    expect(rows[0].textContent).toContain('17%');
    expect(within(rows[0]).getAllByTestId('report-student-missed').map((n) => n.textContent)).toContain('castle');
    expect(rows[1].textContent).toContain('Maya R');
    expect(within(rows[1]).queryAllByTestId('report-student-missed')).toHaveLength(0);
  });

  it('splits the list at the goal so the below-goal group reads first', async () => {
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);
    expect(await screen.findByText('eg2Rep.report.belowGoal:80,1')).toBeInTheDocument();
    expect(screen.getByText('eg2Rep.report.onTrack:1')).toBeInTheDocument();
  });

  it('counts the students below goal on a summary card', async () => {
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);
    expect((await screen.findByTestId('mastery-stat-needHelp')).textContent).toMatch(/1\/2$/);
  });

  it('drills into a student with one tap', async () => {
    const onStudentClick = vi.fn();
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" onStudentClick={onStudentClick} />);
    const rows = await screen.findAllByTestId('report-student-row');
    await waitFor(() => expect(rows[0].textContent).toContain('Sam T'));
    fireEvent.click(rows[0]);
    expect(onStudentClick).toHaveBeenCalledWith('sam', 'Sam T');
  });

  it('labels each hard word with its class mastery state', async () => {
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);
    const chips = await screen.findAllByTestId('report-word-state');
    expect(chips.map((c) => c.textContent)).toContain('eg2Rep.report.state.improving');
  });
});

describe('WordMasteryReport — share and print', () => {
  it('prints the report', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);
    fireEvent.click(await screen.findByRole('button', { name: /eg2Rep.report.print/ }));
    expect(print).toHaveBeenCalled();
  });

  it('copies a plain-language summary a parent or principal can read', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);
    fireEvent.click(await screen.findByRole('button', { name: /eg2Rep.report.share/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('7A');
    expect(text).toContain('eg2Rep.report.summary.accuracy');
    expect(text).toContain('castle');
    expect(await screen.findByText('eg2Rep.report.copied')).toBeInTheDocument();
  });
});

describe('WordMasteryReport — empty class', () => {
  it('tells the teacher the next step with a live-game and an assign action', async () => {
    fetchMock.mockImplementation(() =>
      respond(200, { ok: true, locked: false, report: buildWordMasteryReport(buildClassMastery([])), insights: buildClassInsights(buildClassMastery([])) }),
    );
    render(<WordMasteryReport classroomId={CLASSROOM} classroomName="7A" />);
    const live = await screen.findByRole('link', { name: /eg2Rep.report.empty.live/ });
    expect(live.getAttribute('href')).toBe(`/en/teacher?classroomId=${CLASSROOM}`);
    const assign = screen.getByRole('link', { name: /eg2Rep.report.empty.assign/ });
    expect(assign.getAttribute('href')).toContain('assign=1');
  });
});
