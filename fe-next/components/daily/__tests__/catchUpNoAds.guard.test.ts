import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === '__tests__') return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe('playing a previous day is ad-free', () => {
  it('Given every daily source file, Then none gates a catch-up play behind a rewarded ad', () => {
    const offenders = sourceFiles(ROOT).filter((f) =>
      /surface:\s*'catchup'|shouldGateCatchUpBehindAd|catchupAdUnlockedRef/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });

  it('Given the archive pages, Then they render no banner ads', () => {
    const archive = join(ROOT, '../../app/[locale]/daily/archive');
    const offenders = [join(archive, 'page.tsx'), join(archive, '[date]/page.tsx')].filter((f) =>
      /BannerAd|@\/components\/ads/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
