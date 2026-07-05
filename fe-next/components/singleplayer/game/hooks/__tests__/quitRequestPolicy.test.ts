/**
 * Quit-request policy: pure decision behind useSinglePlayerCore.handleQuitRequest.
 * Protects three things that regress silently:
 *  - practice mode must NOT emit game_abandon_attempted (distinct from a real quit)
 *  - non-practice mid-game quits DO emit the abandon signal
 *  - a game WITH points must ask for confirmation before quitting (no accidental
 *    data loss); a scoreless game quits straight out.
 */
import { describe, it, expect } from 'vitest';
import { resolveQuitRequest } from '../quitRequestPolicy';

describe('resolveQuitRequest', () => {
  it('practice mode → finish, no abandon tracking', () => {
    expect(resolveQuitRequest('practice', 0)).toEqual({ trackAbandon: false, action: 'finishPractice' });
    expect(resolveQuitRequest('practice', 42)).toEqual({ trackAbandon: false, action: 'finishPractice' });
  });

  it('non-practice with a score → track abandon + confirm before quitting', () => {
    expect(resolveQuitRequest('classic', 42)).toEqual({ trackAbandon: true, action: 'confirm' });
  });

  it('non-practice with no score → track abandon + quit immediately', () => {
    expect(resolveQuitRequest('classic', 0)).toEqual({ trackAbandon: true, action: 'quit' });
  });
});
