import { describe, expect, it } from 'vitest';
import { canUseV2ReviewHooks, v2ReviewHooksFromSearch } from '../reviewHooks';

describe('canUseV2ReviewHooks', () => {
  it('allows beta / in-work staff', () => {
    expect(canUseV2ReviewHooks({ canSeeInWorkModes: true, isAdmin: false })).toBe(true);
  });

  it('allows admins even if the work-mode flag is late', () => {
    expect(canUseV2ReviewHooks({ canSeeInWorkModes: false, isAdmin: true })).toBe(true);
  });

  it('denies ordinary players', () => {
    expect(canUseV2ReviewHooks({ canSeeInWorkModes: false, isAdmin: false })).toBe(false);
  });
});

describe('v2ReviewHooksFromSearch', () => {
  it('given a plain player, when ?demo=1&results=1&smash=1, then nothing fires', () => {
    expect(v2ReviewHooksFromSearch('?demo=1&results=1&smash=1&words=cat,dog', false)).toEqual({
      demo: false,
      results: false,
      smash: false,
      words: [],
    });
  });

  it('given staff, when ?demo=1, then seedDemo runs and results/smash stay off', () => {
    expect(v2ReviewHooksFromSearch('?demo=1', true)).toEqual({
      demo: true,
      results: false,
      smash: false,
      words: [],
    });
  });

  it('given staff, when ?demo=1&results=1&smash=1&words=cat,dog, then all review hooks fire', () => {
    expect(v2ReviewHooksFromSearch('?demo=1&results=1&smash=1&words=cat,dog', true)).toEqual({
      demo: true,
      results: true,
      smash: true,
      words: ['cat', 'dog'],
    });
  });

  it('given staff, when results=1 without demo, then results stays off', () => {
    expect(v2ReviewHooksFromSearch('?results=1&smash=1', true)).toEqual({
      demo: false,
      results: false,
      smash: false,
      words: [],
    });
  });
});
