// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/share', () => ({ trackShareCompleted: vi.fn() }));

import { captureHolidayInvite, tableCodeFrom, tableUrl, takeHolidayInvite } from '../holidayShare';

describe('holiday invite capture', () => {
  beforeEach(() => sessionStorage.clear());

  it('Given a holiday invite link, When the friend lands, Then the inviter code is held once for the finish', () => {
    captureHolidayInvite('?holiday=hanukkah&ref=NOA123&hinvite=1');
    expect(takeHolidayInvite()).toEqual({ ref: 'NOA123', holiday: 'hanukkah' });
    expect(takeHolidayInvite()).toBeNull();
  });

  it('Given a plain referral link, Then nothing is held for a rescue', () => {
    captureHolidayInvite('?ref=NOA123');
    expect(takeHolidayInvite()).toBeNull();
  });
});

describe('table links', () => {
  it('Given a table code, Then the link opens the daily and the code reads back', () => {
    const url = tableUrl('https://www.lexiclash.live', 'he', 'ABCDEFGH');
    expect(url).toBe('https://www.lexiclash.live/he/daily?table=ABCDEFGH');
    expect(tableCodeFrom(new URL(url).search)).toBe('ABCDEFGH');
    expect(tableCodeFrom('?table=abc')).toBeNull();
  });
});
