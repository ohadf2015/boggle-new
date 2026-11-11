import { describe, expect, it } from 'vitest';
import { newArrivals } from '../lobbyArrivals';

describe('newArrivals: who just walked into the lobby', () => {
  it('Given the first roster I see, Then nobody counts as just arrived', () => {
    expect(newArrivals(null, ['Noa', 'Ido'])).toEqual([]);
  });

  it('Given a classmate joins, Then only that classmate is new', () => {
    expect(newArrivals(['Noa'], ['Noa', 'Ido'])).toEqual(['Ido']);
  });

  it('Given someone leaves and another joins, Then only the joiner is new', () => {
    expect(newArrivals(['Noa', 'Ido'], ['Noa', 'Dana'])).toEqual(['Dana']);
  });

  it('Given the same names in a new order, Then nobody is new', () => {
    expect(newArrivals(['Noa', 'Ido'], ['Ido', 'Noa'])).toEqual([]);
  });
});
