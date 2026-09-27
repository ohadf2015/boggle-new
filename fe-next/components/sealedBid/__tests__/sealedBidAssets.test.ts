import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SEALED_BID_ASSETS } from '../sealedBidAssets';

describe('SEALED_BID_ASSETS', () => {
  const publicRoot = join(process.cwd(), 'public');

  it('maps every casino surface asset to a real file under public/', () => {
    const paths = Object.values(SEALED_BID_ASSETS);
    expect(paths.length).toBeGreaterThanOrEqual(4);

    for (const publicPath of paths) {
      expect(publicPath.startsWith('/images/sealed-bid/')).toBe(true);
      const diskPath = join(publicRoot, publicPath.replace(/^\//, ''));
      expect(existsSync(diskPath), `missing asset: ${diskPath}`).toBe(true);
    }
  });
});
