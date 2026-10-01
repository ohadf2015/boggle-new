import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/utils/authFetch', () => ({ getWithAuth: vi.fn() }));
vi.mock('@/lib/supabase/education/classrooms', () => ({ getClassroomStudents: vi.fn() }));

import { getWithAuth } from '@/utils/authFetch';
import { useWordMasteryReport } from '../useWordMasteryReport';

const respond = (status: number, body: unknown) =>
  vi.mocked(getWithAuth).mockResolvedValue(new Response(JSON.stringify(body), { status }));

const PREVIEW = { totals: { students: 2 }, hardestWords: [], hiddenWords: 4 };

describe('useWordMasteryReport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('treats the 402 Pro-required response as the locked preview', async () => {
    respond(402, { ok: false, locked: true, error: 'Teacher Pro required', preview: PREVIEW });
    const { result } = renderHook(() => useWordMasteryReport('c1'));
    await waitFor(() => expect(result.current.status).toBe('locked'));
    expect(result.current).toEqual({ status: 'locked', preview: PREVIEW });
  });

  it('a 402 without a preview body is an error, not an empty lock', async () => {
    respond(402, { ok: false, error: 'Teacher Pro required' });
    const { result } = renderHook(() => useWordMasteryReport('c1'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('a Pro 200 is the ready report', async () => {
    respond(200, { ok: true, locked: false, report: { hardestWords: [] } });
    const { result } = renderHook(() => useWordMasteryReport('c1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('a 500 is an error', async () => {
    respond(500, { ok: false, error: 'boom' });
    const { result } = renderHook(() => useWordMasteryReport('c1'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
