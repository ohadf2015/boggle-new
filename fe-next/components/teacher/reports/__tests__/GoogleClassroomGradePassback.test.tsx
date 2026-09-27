import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // key + params, so assertions pin the exact translation key used
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key} ${Object.values(params).join(' ')}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/lib/supabase/education/assignments', () => ({
  getClassroomAssignments: vi.fn(async () => ({
    data: [{ id: '33333333-3333-4333-8333-333333333333', title: 'Animals', vocabulary_lessons: { name: 'Animals' } }],
    error: null,
  })),
}));

import { GoogleClassroomGradePassback } from '../GoogleClassroomGradePassback';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const K = 'teacher.reports.googleClassroom';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_GC_GRADE_PASSBACK', 'true');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GoogleClassroomGradePassback', () => {
  it('renders nothing when the flag is off (default)', () => {
    vi.stubEnv('NEXT_PUBLIC_GC_GRADE_PASSBACK', '');
    const { container } = render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the send button when the flag is on', () => {
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    expect(screen.getByRole('button', { name: `${K}.button` })).toBeInTheDocument();
  });

  it('asks to connect Google when the server says reauth', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'reauth', reauth: true }, 401));
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    const link = await screen.findByRole('link', { name: `${K}.connectCta` });
    expect(link.getAttribute('href')).toContain('/api/education/google-classroom/oauth/start?returnTo=');
  });

  it('picks course + courseWork, confirms, and shows the result summary', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(
        json({
          ok: true,
          courseWork: [
            { id: 'w1', title: 'LexiClash Animals', maxPoints: 100, associatedWithDeveloper: true },
            { id: 'w2', title: 'Teacher-made quiz', maxPoints: 10, associatedWithDeveloper: false },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          ok: true,
          updated: 3,
          unmatched: [{ studentId: 's9', name: 'Guest Fox', reason: 'no_email' }],
          failed: [{ studentId: 's7', name: 'Noa', reason: 'no_submission' }],
          skipped: [{ studentId: 's8', name: null }],
        }),
      );

    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));

    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseLabel`), 'c1');
    const cwSelect = await screen.findByLabelText(`${K}.courseWorkLabel`);
    // courseWork not created by LexiClash cannot be graded → disabled
    expect((screen.getByRole('option', { name: /Teacher-made quiz/ }) as HTMLOptionElement).disabled).toBe(true);
    await userEvent.selectOptions(cwSelect, 'w1');

    await userEvent.click(screen.getByRole('button', { name: `${K}.confirm` }));

    expect(await screen.findByText(`${K}.updated 3`)).toBeInTheDocument();
    expect(screen.getByText(/Guest Fox/)).toBeInTheDocument();
    expect(screen.getByText(/Noa/)).toBeInTheDocument();
    expect(screen.getByText(`${K}.skipped 1`)).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[2];
    expect(url).toBe('/api/education/google-classroom/grades');
    expect(JSON.parse(init.body)).toEqual({
      classroomId: CLASSROOM,
      lessonOrAssignmentId: '33333333-3333-4333-8333-333333333333',
      courseId: 'c1',
      courseWorkId: 'w1',
      returnGrades: false,
    });
  });

  it('shows a rate-limit error with the wait time', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(json({ ok: true, courseWork: [{ id: 'w1', title: 'A', maxPoints: 100, associatedWithDeveloper: true }] }))
      .mockResolvedValueOnce(json({ ok: false, error: 'rate_limited', retryAfter: 30 }, 429));
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseLabel`), 'c1');
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseWorkLabel`), 'w1');
    await userEvent.click(screen.getByRole('button', { name: `${K}.confirm` }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${K}.errorRateLimited 30`);
  });

  it('a Google 403 that reconnecting cannot fix shows an error, not the Connect step', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'google_forbidden' }, 403));
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${K}.errorForbidden`);
    expect(screen.queryByRole('link', { name: `${K}.connectCta` })).toBeNull();
  });

  it('explains partial consent after ?gc=scopes', async () => {
    window.history.replaceState({}, '', '/en/teacher/reports?gc=scopes');
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    expect(await screen.findByText(`${K}.scopesMissing`)).toBeInTheDocument();
    window.history.replaceState({}, '', '/');
  });

  it('shows the actual failure reason next to each failed student, not just their name', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(json({ ok: true, courseWork: [{ id: 'w1', title: 'A', maxPoints: 100, associatedWithDeveloper: true }] }))
      .mockResolvedValueOnce(
        json({
          ok: true,
          updated: 0,
          unmatched: [],
          skipped: [],
          failed: [
            { studentId: 's1', name: 'Noa', reason: 'no_submission' },
            { studentId: 's2', name: 'Ben', reason: 'google_error: Precondition check failed.' },
          ],
        }),
      );
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseLabel`), 'c1');
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseWorkLabel`), 'w1');
    await userEvent.click(screen.getByRole('button', { name: `${K}.confirm` }));

    expect(await screen.findByText(new RegExp(`Noa.*${K}\\.failedReason\\.no_submission`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Ben.*${K}\\.failedReason\\.googleError`))).toBeInTheDocument();
  });

  it('lists grades that were saved but not returned because the student has not turned the work in', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(json({ ok: true, courseWork: [{ id: 'w1', title: 'A', maxPoints: 100, associatedWithDeveloper: true }] }))
      .mockResolvedValueOnce(
        json({ ok: true, updated: 1, unmatched: [], failed: [], skipped: [], notReturned: [{ studentId: 's5', name: 'Ben' }] }),
      );
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseLabel`), 'c1');
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseWorkLabel`), 'w1');
    await userEvent.click(screen.getByRole('button', { name: `${K}.confirm` }));

    expect(await screen.findByText(`${K}.notReturnedTitle`)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Ben.*${K}.notReturnedNote`))).toBeInTheDocument();
  });

  it('resets the "return grades" checkbox after Done, so the next run defaults to drafts-only again', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(json({ ok: true, courseWork: [{ id: 'w1', title: 'A', maxPoints: 100, associatedWithDeveloper: true }] }))
      .mockResolvedValueOnce(json({ ok: true, updated: 1, unmatched: [], failed: [], skipped: [] }))
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(json({ ok: true, courseWork: [{ id: 'w1', title: 'A', maxPoints: 100, associatedWithDeveloper: true }] }));

    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseLabel`), 'c1');
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseWorkLabel`), 'w1');
    await userEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('checkbox')).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: `${K}.confirm` }));

    await userEvent.click(await screen.findByRole('button', { name: `${K}.done` }));
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseLabel`), 'c1');
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseWorkLabel`), 'w1');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('creates a LexiClash-owned Classroom assignment and selects it', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c1', name: '5A' }] }))
      .mockResolvedValueOnce(json({ ok: true, courseWork: [] }))
      .mockResolvedValueOnce(json({ ok: true, courseWork: { id: 'w9', title: 'Animals', maxPoints: 100, associatedWithDeveloper: true } }));
    render(<GoogleClassroomGradePassback classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.button` }));
    await userEvent.selectOptions(await screen.findByLabelText(`${K}.courseLabel`), 'c1');
    await userEvent.click(await screen.findByRole('button', { name: `${K}.createCourseWork` }));
    await waitFor(() => expect((screen.getByLabelText(`${K}.courseWorkLabel`) as HTMLSelectElement).value).toBe('w9'));
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ classroomId: CLASSROOM, courseId: 'c1', title: 'Animals' });
  });
});
