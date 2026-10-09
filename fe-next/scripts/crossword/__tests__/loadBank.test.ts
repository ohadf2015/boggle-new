import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { curatedBankPath, loadBank, mergeBanks, type Bank } from '../loadBank';

const REAL_DATA = resolve(__dirname, '../../../lib/crossword/data');

describe('mergeBanks', () => {
  it('lets a curated entry override the base entry on the same key', () => {
    const base: Bank = { кот: { clue: 'Старая запись', score: 50 } };
    const curated: Bank = { кот: { clue: 'Самец домашней кошки', score: 50 } };
    expect(mergeBanks(base, curated).кот.clue).toBe('Самец домашней кошки');
  });

  it('keeps curated-only keys and base-only keys', () => {
    const merged = mergeBanks({ дом: { clue: 'Здание', score: 50 } }, { оса: { clue: 'Насекомое', score: 50 } });
    expect(Object.keys(merged).sort()).toEqual(['дом', 'оса']);
  });
});

describe('curatedBankPath', () => {
  it('resolves inside the data dir and never to the parked ru-pending banks', () => {
    const p = curatedBankPath(REAL_DATA, 'ru');
    expect(p.startsWith(REAL_DATA)).toBe(true);
    expect(p).not.toContain('ru-pending');
    expect(p.endsWith('clueBank.ru.curated.json')).toBe(true);
  });
});

describe('loadBank', () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'loadbank-'));
    mkdirSync(join(dir, 'sub'), { recursive: true });
    writeFileSync(join(dir, 'clueBank.ru.json'), JSON.stringify({ кот: { clue: 'База', score: 50 } }));
    writeFileSync(join(dir, 'clueBank.ru.curated.json'), JSON.stringify({ кот: { clue: 'Куратор', score: 50 }, оса: { clue: 'Жалит', score: 50 } }));
    writeFileSync(join(dir, 'clueBank.es.json'), JSON.stringify({ casa: { clue: 'Hogar', score: 50 } }));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('merges the curated file over the base bank when it exists', () => {
    const bank = loadBank(dir, 'ru');
    expect(bank.кот.clue).toBe('Куратор');
    expect(bank.оса.clue).toBe('Жалит');
  });

  it('returns the base bank unchanged when there is no curated file', () => {
    expect(Object.keys(loadBank(dir, 'es'))).toEqual(['casa']);
  });

  it('loads the shipped es curated file on top of the base', () => {
    const bank = loadBank(REAL_DATA, 'es');
    expect(bank.ocho.clue).toBe('Número que sigue al siete');
    expect(Object.keys(bank).length).toBeGreaterThan(720);
  });

  it('loads the shipped ru curated file on top of the reviewed base', () => {
    const bank = loadBank(REAL_DATA, 'ru');
    expect(bank.дом.clue.length).toBeGreaterThan(0);
    expect(Object.keys(bank).length).toBeGreaterThan(275);
  });
});
