import { describe, it, expect } from 'vitest';
import { guestAskPlan } from '../mpResultsView';

const guest = { isGuest: true, isClassroom: false };

describe('guestAskPlan', () => {
  it('asks a guest nothing after their first game of the session: only the replay countdown', () => {
    expect(guestAskPlan({ ...guest, sessionGame: 1 })).toEqual({ namePrompt: false, saveCard: false, deferred: true });
  });

  it('asks for a public name from game 2, while the mp_sheet owns the signup ask', () => {
    expect(guestAskPlan({ ...guest, sessionGame: 2 })).toEqual({ namePrompt: true, saveCard: false, deferred: true });
  });

  it('brings back the save-your-XP card from game 3', () => {
    expect(guestAskPlan({ ...guest, sessionGame: 3 })).toEqual({ namePrompt: true, saveCard: true, deferred: false });
    expect(guestAskPlan({ ...guest, sessionGame: 7 })).toEqual({ namePrompt: true, saveCard: true, deferred: false });
  });

  it('never holds anything back for signed-in players or in a classroom', () => {
    const all = { namePrompt: true, saveCard: true, deferred: false };
    expect(guestAskPlan({ isGuest: false, isClassroom: false, sessionGame: 1 })).toEqual(all);
    expect(guestAskPlan({ isGuest: true, isClassroom: true, sessionGame: 1 })).toEqual(all);
  });
});
