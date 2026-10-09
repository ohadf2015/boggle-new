import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type Bank = Record<string, { clue: string; score: number }>;

export function curatedBankPath(dataDir: string, locale: string): string {
  return join(dataDir, `clueBank.${locale}.curated.json`);
}

export function mergeBanks(base: Bank, curated: Bank): Bank {
  return { ...base, ...curated };
}

export function loadBank(dataDir: string, locale: string): Bank {
  const base = JSON.parse(readFileSync(join(dataDir, `clueBank.${locale}.json`), 'utf8')) as Bank;
  const curatedPath = curatedBankPath(dataDir, locale);
  if (!existsSync(curatedPath)) return base;
  return mergeBanks(base, JSON.parse(readFileSync(curatedPath, 'utf8')) as Bank);
}
