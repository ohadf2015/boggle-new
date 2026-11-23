import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8');

// Word modes outside the game provider stack (Word Tower, quick play, practice) announce
// rejected words too, so the announcer lives in the always-mounted providers, once.
describe('screen-reader announcer reaches every word mode', () => {
  it('is mounted by EssentialProviders', () => {
    expect(read('essential-providers.tsx')).toMatch(/<GameAnnouncerProvider>\s*\{memoizedChildren\}/);
  });

  it('is not mounted a second time by the game-only stack', () => {
    expect(read('providers.tsx')).not.toContain('GameAnnouncerProvider');
  });
});
