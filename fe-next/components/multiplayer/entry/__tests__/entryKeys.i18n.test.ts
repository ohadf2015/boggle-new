/**
 * Every `mpUi.entry.*` / `mpUi.shell.*` key the ENTRY piece renders must resolve
 * to a non-empty string in all six locales — resolved through the imported
 * bundles, not grep (sv.js carries a duplicate top-level key).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BUNDLES, LOCALES, resolveKey } from './localeBundles';

const ROOT = join(__dirname, '..', '..', '..', '..');
// ENTRY's files (DESIGN §f). The connection overlays are FOUNDATION's.
const OWNED = [
  'components/multiplayer/entry',
  'components/multiplayer/MultiplayerFlow.tsx',
  'components/multiplayer/useMultiplayerFlowState.ts',
  'components/multiplayer/RoomListView.tsx',
  'components/multiplayer/CreateRoomModal.tsx',
  'components/multiplayer/JoinRoomModal.tsx',
  'components/multiplayer/ArenaCTAStrip.tsx',
  'components/multiplayer/ArenaEmptyState.tsx',
  'components/multiplayer/AvatarStack.tsx',
  'components/multiplayer/CrazyGamesFriendsStrip.tsx',
  'components/multiplayer/CgLobbyHero.tsx',
  'components/multiplayer/MatchmakingOverlay.tsx',
  'components/multiplayer/QuickPlaySeekingOverlay.tsx',
  'components/multiplayer/ClassroomJoinNamePrompt.tsx',
];

function sources(path: string, out: string[] = []): string[] {
  const abs = join(ROOT, path);
  if (statSync(abs).isFile()) {
    out.push(abs);
    return out;
  }
  for (const name of readdirSync(abs)) {
    if (name === '__tests__') continue;
    sources(join(path, name), out);
  }
  return out;
}

const KEYS = Array.from(
  new Set(
    OWNED.flatMap((p) => sources(p)).flatMap((file) =>
      Array.from(readFileSync(file, 'utf8').matchAll(/['"`](mpUi\.(?:entry|shell)\.[A-Za-z0-9_.]+)['"`]/g), (m) => m[1]),
    ),
  ),
).sort();

describe('ENTRY i18n keys', () => {
  it('finds the keys it guards', () => {
    expect(KEYS.length).toBeGreaterThan(0);
  });

  it.each(LOCALES)('%s resolves every ENTRY key to a non-empty string', (locale) => {
    const missing = KEYS.filter((key) => {
      const v = resolveKey(BUNDLES[locale], key);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(missing).toEqual([]);
  });

  it('every mpUi.entry key is rendered by an ENTRY source (no dead copy to translate)', () => {
    const used = new Set(KEYS);
    const dead = Object.keys(resolveKey(BUNDLES.en, 'mpUi.entry') as object)
      .map((key) => `mpUi.entry.${key}`)
      .filter((key) => !used.has(key));
    expect(dead).toEqual([]);
  });

  it('every locale has exactly the English mpUi.entry key set', () => {
    const enKeys = Object.keys(resolveKey(BUNDLES.en, 'mpUi.entry') as object).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(resolveKey(BUNDLES[locale], 'mpUi.entry') as object).sort()).toEqual(enKeys);
    }
  });
});
