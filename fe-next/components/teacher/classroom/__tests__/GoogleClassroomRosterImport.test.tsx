import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key} ${Object.values(params).join(' ')}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

import { GoogleClassroomRosterImport } from '../GoogleClassroomRosterImport';

const CLASSROOM = '11111111-1111-4111-8111-111111111111';
const K = 'teacher.classrooms.gcImport';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GoogleClassroomRosterImport', () => {
  it('renders nothing while the flag is off', () => {
    const { container } = render(<GoogleClassroomRosterImport classroomId={CLASSROOM} />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('offers a connect link when Google asks to re-authorize', async () => {
    vi.stubEnv('NEXT_PUBLIC_GC_ROSTER_IMPORT_ENABLED', 'true');
    fetchMock.mockResolvedValueOnce(json({ ok: false, reauth: true }, 401));
    render(<GoogleClassroomRosterImport classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.action` }));
    const link = await screen.findByRole('link', { name: `${K}.connect` });
    expect(link.getAttribute('href')).toMatch(/^\/api\/education\/google-classroom\/oauth\/start\?returnTo=/);
  });

  it('checks a course, lists who is missing and who needs consent, then links on confirm', async () => {
    vi.stubEnv('NEXT_PUBLIC_GC_ROSTER_IMPORT_ENABLED', 'true');
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c-1', name: 'Grade 4 English' }] }))
      .mockResolvedValueOnce(
        json({
          ok: true,
          rosterCount: 3,
          matchedCount: 2,
          unmatchedCount: 1,
          matched: [
            { studentId: 's1', name: 'Dana', consentNeeded: true },
            { studentId: 's2', name: 'Ari', consentNeeded: false },
          ],
          unmatched: [{ displayName: 'Maya K.' }],
          linked: 0,
          skippedForConsent: 0,
        }),
      )
      .mockResolvedValueOnce(json({ ok: true, matchedCount: 2, unmatchedCount: 1, matched: [], unmatched: [], linked: 1, skippedForConsent: 1 }));

    render(<GoogleClassroomRosterImport classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.action` }));
    await screen.findByRole('option', { name: 'Grade 4 English' });
    await userEvent.click(screen.getByRole('button', { name: `${K}.check` }));

    expect(await screen.findByText(`${K}.matched 2`)).toBeInTheDocument();
    expect(screen.getByText(`${K}.unmatchedTitle 1`)).toBeInTheDocument();
    expect(screen.getByText('Maya K.')).toBeInTheDocument();
    expect(screen.getByText(`${K}.consentTitle 1`)).toBeInTheDocument();
    expect(screen.getByText('Dana')).toBeInTheDocument();

    const [, checkInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(JSON.parse(String(checkInit.body))).toEqual({ classroomId: CLASSROOM, courseId: 'c-1' });

    await userEvent.click(screen.getByRole('button', { name: `${K}.link` }));
    await waitFor(() => expect(screen.getByText(`${K}.linked 1`)).toBeInTheDocument());
    const [url, linkInit] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(url).toBe('/api/education/google-classroom/roster');
    expect(JSON.parse(String(linkInit.body))).toEqual({ classroomId: CLASSROOM, courseId: 'c-1', link: true });
  });

  it('shows an error instead of an empty result when the check fails', async () => {
    vi.stubEnv('NEXT_PUBLIC_GC_ROSTER_IMPORT_ENABLED', 'true');
    fetchMock
      .mockResolvedValueOnce(json({ ok: true, courses: [{ id: 'c-1', name: 'G4' }] }))
      .mockResolvedValueOnce(json({ ok: false, error: 'google_error' }, 502));
    render(<GoogleClassroomRosterImport classroomId={CLASSROOM} />);
    await userEvent.click(screen.getByRole('button', { name: `${K}.action` }));
    await screen.findByRole('option', { name: 'G4' });
    await userEvent.click(screen.getByRole('button', { name: `${K}.check` }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${K}.error`);
  });
});
