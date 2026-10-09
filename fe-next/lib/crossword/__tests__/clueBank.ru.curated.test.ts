import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createSafeReadFile, loadRussianDictionary } from '../../../backend/dictionaryLoaders';

const FILE = join(__dirname, '../data/clueBank.ru.curated.json');
const text = readFileSync(FILE, 'utf8');
const bank = JSON.parse(text) as Record<string, { clue: string; score: number }>;
const keys = Object.keys(bank);
const fold = (w: string) => w.toLowerCase().replace(/ё/g, 'е');

describe('clueBank.ru.curated.json', () => {
  let dict: Set<string>;
  beforeAll(async () => {
    dict = await loadRussianDictionary(createSafeReadFile());
  });

  it('loads the full Russian dictionary, not an empty set', () => {
    expect(dict.size).toBeGreaterThan(1_000_000);
  });

  it('has no duplicate top-level keys in the raw text', () => {
    const rawKeys = [...text.matchAll(/^\s{2}"([^"]+)":/gm)].map((m) => m[1]);
    expect(rawKeys.length).toBe(keys.length);
    expect(new Set(rawKeys).size).toBe(rawKeys.length);
  });

  it('every answer is 3-6 lowercase Cyrillic letters and is in the dictionary', () => {
    const failures = keys.filter((k) => !/^[а-я]+$/.test(k) || k.length < 3 || k.length > 6 || !dict.has(fold(k)));
    expect(failures).toEqual([]);
  });

  it('every clue is non-empty and does not contain its answer', () => {
    const failures = keys.filter((k) => {
      const clue = bank[k].clue?.trim() ?? '';
      return clue.length === 0 || fold(clue).includes(fold(k));
    });
    expect(failures).toEqual([]);
  });

  it('every entry has a numeric score', () => {
    expect(keys.filter((k) => typeof bank[k].score !== 'number')).toEqual([]);
  });
});
