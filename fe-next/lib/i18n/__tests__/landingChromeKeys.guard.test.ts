import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { en } from '@/translations/en';
import { pickLandingMessages } from '../pickLandingMessages';
import { LANDING_NAMESPACES, LANDING_EXTRA_KEYS } from '../landingNamespaces';

// Chrome that renders on the landing before the full catalogue loads; its keys painted raw on prod.
const LANDING_CHROME = ['components/avatar/reveal/HeaderProfileEntry.tsx', 'components/PWAInstallPrompt.tsx'];

const resolve = (root: Record<string, unknown>, key: string): unknown =>
  key.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[p] : undefined), root);

const keysIn = (file: string): string[] => {
  const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  return [...new Set([...src.matchAll(/\bt\(\s*['"]([\w.-]+)['"]/g)].map(m => m[1]))];
};

describe('landing chrome keys are in the first-paint catalogue', () => {
  const subset = pickLandingMessages(en as Record<string, unknown>, LANDING_NAMESPACES, LANDING_EXTRA_KEYS);
  const cases = LANDING_CHROME.flatMap(file => keysIn(file).map(key => [file, key] as const));

  it('finds keys in every file', () => {
    for (const file of LANDING_CHROME) expect(keysIn(file).length).toBeGreaterThan(0);
  });

  it.each(cases)('%s: %s', (_file, key) => {
    expect(typeof resolve(subset, key)).toBe('string');
  });
});
