/**
 * Several consumers mount in the same tick (plan badge, ProGate 'analytics', ProGate
 * 'reports') and share one in-flight status request. A real Response body can be read
 * once: when every consumer called `.json()` on the shared Response, the second read threw
 * "body already used", the catch fell back to FREE, and a paying teacher saw a paywall on
 * all but one surface. The existing mock (`json: async () => body`) can be read forever,
 * so only a real Response reproduces it.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { useTeacherPro } from '../useTeacherPro';

describe('useTeacherPro — concurrent consumers', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('GIVEN three consumers mounted together WHEN the teacher has Pro THEN every one of them sees Pro', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ has_pro: true, source: 'polar' }), { status: 200 }),
    ) as unknown as typeof fetch;

    const a = renderHook(() => useTeacherPro());
    const b = renderHook(() => useTeacherPro());
    const c = renderHook(() => useTeacherPro());

    for (const h of [a, b, c]) {
      await waitFor(() => expect(h.result.current.loading).toBe(false));
      expect(h.result.current.hasPro).toBe(true);
    }
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
