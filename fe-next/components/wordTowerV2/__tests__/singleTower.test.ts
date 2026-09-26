import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';
import { MODE_META } from '@/lib/landing/modeMeta';

const root = join(__dirname, '../../..');
const src = (p: string) => readFileSync(join(root, p), 'utf8');

describe('one Word Tower', () => {
  it('given the run starts, when the game renders, then no labels sit over the tower base above the dock', () => {
    const game = src('components/wordTowerV2/WordTowerV2.tsx');
    expect(game).not.toContain('<PerkChips');
    expect(game).not.toContain('wordTowerV2.hint.spell');
    expect(game).not.toContain('wordTowerV2.editHint');
  });

  it('given the hub, when mode metadata is read, then only the V2 tower has a card', () => {
    expect(Object.keys(MODE_META)).not.toContain('wordTower');
    expect(MODE_META.wordTowerV2?.path).toBe('/word-tower');
  });

  it('given the multiplayer mode picker, when it lists modes, then the legacy word-tower mode is gone', () => {
    expect(src('host/components/pre-game/BattleModeCard.tsx')).not.toMatch(/mode: 'word-tower'/);
  });

  it.each([['en', en], ['he', he], ['sv', sv], ['ja', ja], ['es', es], ['ru', ru]] as const)(
    'given %s, when the tower card is titled, then it carries no version suffix',
    (_l, dict) => {
      const d = dict as unknown as Record<string, any>;
      for (const title of [d.wordTowerV2.cardTitle, d.homeFresh.modes.items.wordTowerV2.title]) {
        expect(title).not.toMatch(/v2|\s2$/i);
      }
    },
  );
});
