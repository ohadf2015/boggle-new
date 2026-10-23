import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/education/ownedClassroomRoute', () => ({ authorizeClassroomOwner: vi.fn() }));
vi.mock('@/lib/education/liveGameForClassroom', () => ({ lookupLiveGameForClassroom: vi.fn(async () => null) }));
vi.mock('../../../join/endedSessionCode', () => ({
  countEndedCodeTries: vi.fn(async () => 0),
  clearEndedCodeTries: vi.fn(async () => undefined),
}));

import { GET } from '../route';
import { authorizeClassroomOwner } from '@/lib/education/ownedClassroomRoute';
import { lookupLiveGameForClassroom } from '@/lib/education/liveGameForClassroom';
import { countEndedCodeTries, clearEndedCodeTries } from '../../../join/endedSessionCode';

const mocked = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const call = () => GET(new Request('https://x.test') as never, { params: Promise.resolve({ id: 'c1' }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocked(authorizeClassroomOwner).mockResolvedValue({ ok: true, userId: 't1', sb: {}, classroom: { id: 'c1' } });
  mocked(lookupLiveGameForClassroom).mockResolvedValue(null);
});

describe('GET /api/education/classroom/[id]/ended-code-tries', () => {
  it('given students tried an ended code and no game is live, then the teacher sees the count', async () => {
    mocked(countEndedCodeTries).mockResolvedValue(4);
    const res = await call();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ count: 4 });
  });

  it('given a game is live again, then the tally is cleared and reads zero', async () => {
    mocked(countEndedCodeTries).mockResolvedValue(4);
    mocked(lookupLiveGameForClassroom).mockResolvedValue('NEW999');
    await expect((await call()).json()).resolves.toEqual({ count: 0 });
    expect(clearEndedCodeTries).toHaveBeenCalledWith('c1');
  });

  it('given someone who does not own the class, then it refuses', async () => {
    mocked(authorizeClassroomOwner).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    });
    expect((await call()).status).toBe(403);
    expect(countEndedCodeTries).not.toHaveBeenCalled();
  });
});
