import { describe, it, expect } from 'vitest';
import { showInlineSignup } from '../mpResultsView';

const base = { isGuest: true, isClassroom: false, footerShown: true, branch: 'final' as const };

describe('showInlineSignup', () => {
  it('never shows the results_inline card — 0 signups from 39 guests (t_39705c3f)', () => {
    expect(showInlineSignup(base)).toBe(false);
  });

  it('never in the gap between rounds', () => {
    expect(showInlineSignup({ ...base, branch: 'intermission' })).toBe(false);
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
