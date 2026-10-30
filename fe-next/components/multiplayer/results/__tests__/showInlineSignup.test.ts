import { describe, it, expect } from 'vitest';
import { showInlineSignup } from '../mpResultsView';

const base = { isGuest: true, isClassroom: false, footerShown: true, bridgeShowing: false, branch: 'final' as const };

describe('showInlineSignup (series-end only, below the primary)', () => {
  it('a guest sees it on the series-end screen once the footer is up', () => {
    expect(showInlineSignup(base)).toBe(true);
  });

  it('never in the gap between rounds', () => {
    expect(showInlineSignup({ ...base, branch: 'intermission' })).toBe(false);
  });

  it('never alongside the first-game bridge', () => {
    expect(showInlineSignup({ ...base, bridgeShowing: true })).toBe(false);
  });

  it('never before the footer, for signed-in players, or in a classroom', () => {
    expect(showInlineSignup({ ...base, footerShown: false })).toBe(false);
    expect(showInlineSignup({ ...base, isGuest: false })).toBe(false);
    expect(showInlineSignup({ ...base, isClassroom: true })).toBe(false);
  });

  it('not while the branch is still pending', () => {
    expect(showInlineSignup({ ...base, branch: null })).toBe(false);
  });
});
