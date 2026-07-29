/**
 * TDD for "bump Blast up the mode order, under multiplayer" (2026-06-07).
 * Blast must sit directly after the multiplayer ('arena') card.
 */
import { placeBlastAfterArena } from '../blastPlacement';

describe('placeBlastAfterArena', () => {
  it('moves blast to immediately after arena', () => {
    expect(placeBlastAfterArena(['daily', 'arena', 'practice', 'blast', 'adventure']))
      .toEqual(['daily', 'arena', 'blast', 'practice', 'adventure']);
  });

  it('leaves order unchanged when blast already follows arena', () => {
    const order = ['daily', 'arena', 'blast', 'practice'];
    expect(placeBlastAfterArena(order)).toEqual(order);
  });

  it('handles blast appearing BEFORE arena', () => {
    expect(placeBlastAfterArena(['blast', 'daily', 'arena', 'practice']))
      .toEqual(['daily', 'arena', 'blast', 'practice']);
  });

  it('is a no-op when arena is absent', () => {
    const order = ['daily', 'practice', 'blast'];
    expect(placeBlastAfterArena(order)).toEqual(order);
  });

  it('is a no-op when blast is absent', () => {
    const order = ['daily', 'arena', 'practice'];
    expect(placeBlastAfterArena(order)).toEqual(order);
  });

  it('does not mutate the input array', () => {
    const order = ['daily', 'arena', 'practice', 'blast'];
    const copy = [...order];
    placeBlastAfterArena(order);
    expect(order).toEqual(copy);
  });
});
