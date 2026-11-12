import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '../../..');

/** Profile surfaces show a level as the shared badge, never as bare "Level 7" text. */
const SPOTS = [
  'app/[locale]/player/[id]/PageClient.tsx',
  'components/ui/PlayerProfileTooltip.tsx',
  'components/friends/FriendDetailDialog.tsx',
];

describe('player levels render as LevelBadge', () => {
  it.each(SPOTS)('%s uses LevelBadge', (file) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    expect(src).toMatch(/<LevelBadge\b/);
    expect(src).not.toMatch(/\{t\('profile\.level'\)\}\s*\{/);
  });
});
