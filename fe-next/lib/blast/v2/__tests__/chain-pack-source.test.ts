import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { ChainPackSource } from '../chain-pack-source';
import { validateChainLevel } from '../engine/chain-validator';

const basePath = resolve(process.cwd(), 'content/blast/packs');

describe('ChainPackSource', () => {
  it('resolves level 1 for en as a valid forced-chain level', async () => {
    const source = new ChainPackSource(basePath);
    const level = await source.resolve(1, 'en');
    expect(level.id).toBe('en-chain-01');
    expect(level.words).toEqual(['CAT', 'SUN', 'EGG']);
    expect(validateChainLevel(level).ok).toBe(true);
  });

  it('throws for a level number not in the pack', async () => {
    const source = new ChainPackSource(basePath);
    await expect(source.resolve(99, 'en')).rejects.toThrow(/no chain spec/i);
  });
});
