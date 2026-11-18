import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', 'components');
const BANNED = /\b(?:app|created|application)\??\.destroy\(\s*true\b/;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('Pixi Application teardown', () => {
  it('never passes `true`, which empties the texture and batch pools of every other live canvas', () => {
    const offenders = sources(ROOT).filter((file) => BANNED.test(readFileSync(file, 'utf8'))).map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});
