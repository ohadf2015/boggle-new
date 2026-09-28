import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = readFileSync(path.resolve(__dirname, '..', 'LocaleBodyChrome.tsx'), 'utf8');

describe('LocaleBodyChrome', () => {
  it('is a client component', () => {
    expect(SRC.trimStart().startsWith("'use client'")).toBe(true);
  });

  it('loads SiteExtras with ssr: false so /singleplayer does not parse footer/nav/OAuth', () => {
    expect(SRC).toContain("import('./SiteExtras')");
    expect(SRC).toMatch(/ssr:\s*false/);
  });

  it('loads ConditionalProviders through next/dynamic', () => {
    expect(SRC).toContain('conditional-providers');
    expect(SRC).toContain('nextDynamic');
  });
});
