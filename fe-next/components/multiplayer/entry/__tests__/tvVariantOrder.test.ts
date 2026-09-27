/**
 * The generated stylesheet emits `desktop-tall:*` utilities AFTER `tv:*` ones,
 * so when one element sets the same property under both, the desktop value wins
 * on a 1920x1080 screen (measured: identity avatar 112px instead of 160, name
 * 30px instead of 48). A TV size must be stacked on the desktop variant
 * (`desktop-tall:tv:*` sorts after `desktop-tall:*`); every TV screen is also
 * desktop-tall, so the stack means exactly "tv".
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');
const ENTRY_DIR = 'components/multiplayer/entry';
const ENTRY_FILES = [
  ...readdirSync(join(ROOT, ENTRY_DIR))
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => `${ENTRY_DIR}/${name}`),
  'components/multiplayer/RoomListView.tsx',
  'components/multiplayer/MultiplayerFlow.tsx',
  'components/multiplayer/ArenaCTAStrip.tsx',
  'components/multiplayer/ArenaEmptyState.tsx',
];

const FONT_SIZE = /^(?:xs|sm|base|lg|xl|[2-9]xl|\[.+\])$/;

/** The CSS property a utility sets, coarsely: `h-28` → `h`, `text-3xl` → `font-size`. */
function family(utility: string): string {
  const u = utility.replace(/!$/, '');
  if (u.startsWith('text-')) {
    const value = u.slice('text-'.length).split('/')[0];
    return FONT_SIZE.test(value) ? 'font-size' : `text:${value}`;
  }
  const dash = u.lastIndexOf('-');
  return dash > 0 ? u.slice(0, dash) : u;
}

/** `desktop-tall:x` / `tv:x` with no further variant stacked on x. */
function underOnly(cls: string, variant: string): string | null {
  if (!cls.startsWith(`${variant}:`)) return null;
  const rest = cls.slice(variant.length + 1);
  return rest.includes(':') ? null : rest;
}

function conflicts(file: string): string[] {
  const source = readFileSync(join(ROOT, file), 'utf8');
  const out: string[] = [];
  for (const [, literal] of source.matchAll(/['"`]([^'"`]*\btv:[^'"`]*)['"`]/g)) {
    const classes = literal.split(/\s+/);
    const desktop = new Map<string, string>();
    for (const cls of classes) {
      const u = underOnly(cls, 'desktop-tall');
      if (u) desktop.set(family(u), cls);
    }
    for (const cls of classes) {
      const u = underOnly(cls, 'tv');
      if (u && desktop.has(family(u))) out.push(`${file}: ${desktop.get(family(u))} beats ${cls}`);
    }
  }
  return out;
}

describe('TV sizes on ENTRY screens', () => {
  it('never lose to a desktop-tall value for the same property', () => {
    expect(ENTRY_FILES.flatMap(conflicts)).toEqual([]);
  });
});
