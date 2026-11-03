import { describe, expect, it } from 'vitest';
import { starterGridClass } from '../StarterPacksSection.data';

describe('starterGridClass', () => {
  it('Given one starter pack, Then it gets a single full-width column', () => {
    expect(starterGridClass(1)).not.toMatch(/grid-cols-[23]/);
  });

  it('Given two starter packs, Then they split into two columns and never leave a third empty slot', () => {
    const cls = starterGridClass(2);
    expect(cls).toMatch(/@xl:grid-cols-2/);
    expect(cls).not.toMatch(/grid-cols-3/);
  });

  it('Given three or more packs, Then wide screens get three columns', () => {
    expect(starterGridClass(3)).toMatch(/@5xl:grid-cols-3/);
  });
});
