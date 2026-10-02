import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildLocaleLlms } from '@/app/[locale]/llms.txt/content';
import { getCatalog } from '../catalog';

describe('word lists in llms.txt', () => {
  it('per-locale llms.txt names the library, its language hubs and the English grade hubs', () => {
    const en = buildLocaleLlms('en');
    expect(en).toContain('https://www.lexiclash.live/en/education/lists');
    expect(en).toContain('https://www.lexiclash.live/en/education/lists/english/grade-5');
    expect(en).toContain('https://www.lexiclash.live/en/education/lists/topic/animals');
    expect(en).toContain(`${getCatalog().lists.length}`);
  });

  it('Hebrew and Spanish llms.txt point at their own-language lists', () => {
    expect(buildLocaleLlms('he')).toContain('https://www.lexiclash.live/he/education/lists/hebrew');
    expect(buildLocaleLlms('es')).toContain('https://www.lexiclash.live/es/education/lists/spanish');
    expect(buildLocaleLlms('ja')).toContain('https://www.lexiclash.live/ja/education/lists/english');
  });

  it('the root llms.txt lists the library', () => {
    const root = readFileSync(join(__dirname, '..', '..', '..', '..', 'public', 'llms.txt'), 'utf8');
    expect(root).toContain('https://www.lexiclash.live/en/education/lists');
  });
});
