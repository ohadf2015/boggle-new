import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { en } from '../../../../translations/en';
import { he } from '../../../../translations/he';
import { sv } from '../../../../translations/sv';
import { ja } from '../../../../translations/ja';
import { es } from '../../../../translations/es';
import { ru } from '../../../../translations/ru';

const LOCALES = { en, he, sv, ja, es, ru } as Record<string, { tvBroadcast?: Record<string, unknown> }>;
const FILES = ['TvWordDropFeed.tsx', 'TvActivityPanel.tsx', 'TvGapIndicator.tsx', 'TvLeaderboard.tsx'];

describe('every tvBroadcast key the wall prints exists in every locale', () => {
  const keys = new Set<string>();
  for (const file of FILES) {
    for (const m of readFileSync(join(__dirname, '..', file), 'utf8').matchAll(/t\('tvBroadcast\.(\w+)'/g)) keys.add(m[1]);
  }
  for (const [lang, bundle] of Object.entries(LOCALES)) {
    it(lang, () => {
      const missing = [...keys].filter((k) => typeof bundle.tvBroadcast?.[k] !== 'string');
      expect(missing).toEqual([]);
    });
  }
});
