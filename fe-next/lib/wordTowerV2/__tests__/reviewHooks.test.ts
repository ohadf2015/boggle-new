import { describe, expect, it } from 'vitest';
import { parseReviewHooks } from '../reviewHooks';

describe('parseReviewHooks', () => {
  it('given a player who is not admin, when demo=1 is in the URL, then every hook is closed', () => {
    expect(parseReviewHooks('?demo=1&results=1&smash=1&words=tower,slab', { isAdmin: false })).toEqual({
      seed: false,
      words: [],
      results: false,
      smash: false,
    });
  });

  it('given an admin, when demo=1 is in the URL, then the seed hook opens', () => {
    expect(parseReviewHooks('?demo=1', { isAdmin: true }).seed).toBe(true);
  });

  it('given an admin, when demo+results+smash, then those hooks open', () => {
    const hooks = parseReviewHooks('demo=1&results=1&smash=1', { isAdmin: true });
    expect(hooks).toMatchObject({ seed: true, results: true, smash: true });
  });

  it('given an admin without demo, when results is set, then hooks stay closed', () => {
    expect(parseReviewHooks('?results=1&smash=1', { isAdmin: true }).results).toBe(false);
  });
});
