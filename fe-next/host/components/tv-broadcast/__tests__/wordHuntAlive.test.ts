import { describe, it, expect } from 'vitest';
import { wordHuntAlive } from '../wordHuntAlive';

describe('wordHuntAlive', () => {
  it('GIVEN two seated students and no lives reported yet WHEN the projector shows the hunt THEN it reads 2 alive of 2, not 0', () => {
    expect(wordHuntAlive({}, [], 2)).toEqual({ alive: 2, total: 2 });
  });

  it('GIVEN lives from the server WHEN one hunter is out THEN the server count wins', () => {
    expect(wordHuntAlive({ a: 100, b: 0, c: 40 }, ['b'], 3)).toEqual({ alive: 2, total: 3 });
  });
});
