import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/daily/loadDailyBoard', () => ({ loadRankedDailyBoard: vi.fn() }));
vi.mock('@/lib/quickPlay/fetchGhostRivals', () => ({ fetchGhostRivals: vi.fn() }));

import { rivalDeps } from '../rivalDeps';
import { pingFakeDb, type Handler } from './pingFakeDb';

const ADULT_TEACHER = 'a1';
const KID = 'k1';
const UNDECLARED_STUDENT = 's1';
const CONSENTED = 'c1';
const STRANGER = 'x1';

function deps(over: Partial<Record<string, Handler>> = {}) {
  const fake = pingFakeDb({
    classroom_memberships: () => ({
      data: [{ student_id: ADULT_TEACHER }, { student_id: KID }, { student_id: UNDECLARED_STUDENT }],
      error: null,
    }),
    parental_consents: () => ({ data: [{ user_id: CONSENTED }], error: null }),
    profiles: () => ({
      data: [
        { id: ADULT_TEACHER, birth_year: 1994 },
        { id: KID, birth_year: new Date().getUTCFullYear() - 11 },
        { id: CONSENTED, birth_year: 1990 },
      ],
      error: null,
    }),
    friends: () => ({ data: [], error: null }),
    ...over,
  } as Record<string, Handler>);
  return rivalDeps(fake.client);
}

describe('rivalDeps.excludedIds', () => {
  it('keeps declared adults in a class as rivals and hides kids, undeclared students and consented players', async () => {
    const out = await deps().excludedIds('me', [ADULT_TEACHER, KID, UNDECLARED_STUDENT, CONSENTED, STRANGER]);
    expect(new Set(out)).toEqual(new Set([KID, UNDECLARED_STUDENT, CONSENTED]));
  });

  it('fails closed when the age lookup errors', async () => {
    const d = deps({ profiles: () => ({ data: null, error: { message: 'boom' } }) });
    await expect(d.excludedIds('me', [ADULT_TEACHER])).rejects.toThrow();
  });
});
