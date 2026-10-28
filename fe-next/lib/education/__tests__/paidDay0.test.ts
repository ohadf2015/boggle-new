import { describe, expect, it } from 'vitest';
import {
  defaultClassName,
  honorRehearsalJoin,
  isPaidCampaignProfile,
  realClassPlayerIds,
  shareCodeDueAfterDays,
} from '../paidDay0';

describe('paid day-0', () => {
  it('recognises utm_medium=paid and nothing else', () => {
    expect(isPaidCampaignProfile({ utm_medium: 'paid' })).toBe(true);
    expect(isPaidCampaignProfile({ utm_medium: ' Paid ' })).toBe(true);
    expect(isPaidCampaignProfile({ utm_medium: 'cpc' })).toBe(false);
    expect(isPaidCampaignProfile(null)).toBe(false);
  });

  it('owes the share-code nudge immediately for paid teachers and after a day otherwise', () => {
    expect(shareCodeDueAfterDays(true)).toBe(0);
    expect(shareCodeDueAfterDays(false)).toBe(1);
  });

  it('honours one rehearsal seat and refuses a second', () => {
    expect(honorRehearsalJoin(true, 0)).toBe(true);
    expect(honorRehearsalJoin(true, 1)).toBe(false);
    expect(honorRehearsalJoin(false, 0)).toBe(false);
  });

  it('drops rehearsal players from the trial-clock count', () => {
    expect(realClassPlayerIds(['s1', 'rehearsal', 's2'], new Set(['rehearsal']))).toEqual(['s1', 's2']);
    expect(realClassPlayerIds(['rehearsal'], new Set(['rehearsal']))).toEqual([]);
  });

  it('names the first class in the teacher locale', () => {
    expect(defaultClassName('he')).toBe('הכיתה שלי');
    expect(defaultClassName('en')).toBe('My class');
    expect(defaultClassName('xx')).toBe('My class');
  });
});
