import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: vi.fn(), register: vi.fn(), __loaded: true },
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { trackEduJoinCodeCopied, trackEduLiveGameStarted } from '../telemetry';

const fetchMock = vi.fn(async () => new Response('{}'));

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

function patchedBody(): unknown {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => url === '/api/education/teacher/activation' && (init as RequestInit)?.method === 'PATCH',
  );
  return call ? JSON.parse(String((call[1] as RequestInit).body)) : null;
}

describe('activation checklist progress follows the real actions', () => {
  it('Given a teacher copies the join link anywhere on HQ, Then invite-copied is saved', () => {
    trackEduJoinCodeCopied({ classroomId: 'c1' });
    expect(patchedBody()).toEqual({ inviteCopied: true });
  });

  it('Given a teacher launches a live game from any entry, Then live-started is saved', () => {
    trackEduLiveGameStarted({ classroomId: 'c1', source: 'hq_express' });
    expect(patchedBody()).toEqual({ liveStarted: true });
  });
});
