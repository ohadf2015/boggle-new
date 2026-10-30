import { describe, it, expect } from 'vitest';
import { showInlineSignup } from '../mpResultsView';

const base = { isGuest: true, isClassroom: false, footerShown: true, bridgeShowing: false, seriesEndOnly: false, branch: 'intermission' as const };

describe('showInlineSignup (one growth card, below the primary)', () => {
  it('control arm: a guest sees it on every round end once the footer is up', () => {
    expect(showInlineSignup(base)).toBe(true);
    expect(showInlineSignup({ ...base, branch: 'final' })).toBe(true);
  });

  it('series-end arm: only on the final screen', () => {
    expect(showInlineSignup({ ...base, seriesEndOnly: true })).toBe(false);
    expect(showInlineSignup({ ...base, seriesEndOnly: true, branch: 'final' })).toBe(true);
  });

  it('never alongside the first-game bridge', () => {
    expect(showInlineSignup({ ...base, bridgeShowing: true, branch: 'final' })).toBe(false);
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
