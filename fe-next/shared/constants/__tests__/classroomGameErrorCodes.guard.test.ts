import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { CLASSROOM_GAME_ERROR_CODES } from '../classroomGameErrors';

const ROOT = join(__dirname, '../../..');
const BACKEND = join(ROOT, 'backend');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' || name === 'node_modules' ? [] : sourceFiles(path);
    return /\.ts$/.test(name) && !/\.(test|spec)\.ts$/.test(name) ? [path] : [];
  });
}

/** The rest of the call that names `classroomGameError`, up to its closing paren. */
function callArgs(src: string, from: number): string {
  let depth = 1;
  for (let i = from; i < src.length; i++) {
    if (src[i] === '(') depth++;
    if (src[i] === ')' && --depth === 0) return src.slice(from, i);
  }
  return src.slice(from);
}

const emits = sourceFiles(BACKEND).flatMap((file) => {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/'classroomGameError'/g)]
    .filter((m) => !/=\s*$/.test(src.slice(Math.max(0, m.index! - 20), m.index)))
    .map((m) => ({
      where: `${relative(ROOT, file)}:${src.slice(0, m.index).split('\n').length}`,
      args: callArgs(src, m.index! + m[0].length),
    }));
});

const KNOWN = new Set<string>(CLASSROOM_GAME_ERROR_CODES);

describe('every classroomGameError emit carries a code from the shared list', () => {
  it('finds the emits it is checking', () => {
    expect(emits.length).toBeGreaterThanOrEqual(25);
  });

  it.each(emits.map((e) => [e.where, e.args] as const))('%s carries a code', (_where, args) => {
    expect(args).toMatch(/\bcode\b|\.\.\.(FAILED|refusal)\b/);
    expect(args, 'a code only on some branches').not.toMatch(/\?\s*\{[^}]*\bcode\b/);
  });

  it.each(emits.map((e) => [e.where, e.args] as const))('%s uses a listed code', (_where, args) => {
    for (const [, code] of args.matchAll(/\bcode:\s*'([A-Z_]+)'/g)) expect(KNOWN).toContain(code);
  });
});
