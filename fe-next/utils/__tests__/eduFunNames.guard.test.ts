import { describe, it, expect } from 'vitest';
import { EDU_FUN_NAMES } from '../eduFunNames';
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

const pools = { en, he, sv, ja, es, ru } as Record<string, { eduStudent: { join: { funNames: string } } }>;

describe('EDU_FUN_NAMES matches the join screen suggestions', () => {
  it.each(Object.keys(pools))('Given %s, Then every suggested fun name is listed as generated', (lang) => {
    const names = pools[lang].eduStudent.join.funNames.split(/[,،、|]/).map((n) => n.trim()).filter(Boolean);
    expect(EDU_FUN_NAMES[lang]).toEqual(names);
  });
});
