import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pickLandingMessages } from '@/lib/i18n/pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '@/lib/i18n/landingNamespaces';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

// /multiplayer is a heavy game path: the client hydrates on the slim catalogue while SSR used the full one.
const ROOT = join(__dirname, '../../..');
const FIRST_PAINT_FILES = [
  'components/multiplayer/entry/EntryHeader.tsx',
  'components/multiplayer/entry/EntryIdentity.tsx',
  'components/multiplayer/entry/CodeEntry.tsx',
  'components/multiplayer/entry/ArenaList.tsx',
  'components/multiplayer/ArenaEmptyState.tsx',
  'components/multiplayer/ArenaCTAStrip.tsx',
  'components/multiplayer/RoomListView.tsx',
];
const INDIRECT_KEYS = ['mpUi.shell.back', 'mpUi.shell.home', 'mpUi.shell.leave'];

const keysIn = (file: string): string[] =>
  [...readFileSync(join(ROOT, file), 'utf8').matchAll(/\bt\(\s*['"]([A-Za-z]\w*(?:\.\w+)+)['"]/g)].map((m) => m[1]);

const KEYS = [...new Set([...FIRST_PAINT_FILES.flatMap(keysIn), ...INDIRECT_KEYS])].sort();

const resolve = (root: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>(
    (o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined),
    root,
  );

const locales = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;

describe('MP entry first paint hydrates on the slim catalogue', () => {
  it('extracts the entry keys it guards', () => {
    expect(KEYS).toContain('multiplayerFlow.roomList.arenaHub');
    expect(KEYS).toContain('mpUi.entry.tagline');
    expect(KEYS.length).toBeGreaterThan(15);
  });

  describe.each(Object.keys(locales))('%s', (lang) => {
    const full = locales[lang];
    const subset = pickLandingMessages(full, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);

    it.each(KEYS)('%s matches the SSR text', (key) => {
      expect(resolve(subset, key)).toBe(resolve(full, key));
      expect(typeof resolve(subset, key)).toBe('string');
    });
  });
});
