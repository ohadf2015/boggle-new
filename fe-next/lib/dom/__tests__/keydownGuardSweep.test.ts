/**
 * Every window/document keydown handler in a game must ignore keystrokes aimed
 * at a text field — via isTypingTarget, never `e.target instanceof HTMLInputElement`.
 *
 * The feedback widget renders into a shadow root, so by the time its keydown
 * reaches window `e.target` is the shadow HOST (a DIV). An `instanceof` guard
 * reads "not typing", and the game then preventDefaults Space / Backspace /
 * Enter the player is typing into the feedback form. #840 fixed eight sites,
 * #971 a ninth; this sweep keeps the pattern from coming back.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const DIRS = ['components', 'hooks', 'lib'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' ? [] : sourceFiles(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const files = DIRS.flatMap((d) => sourceFiles(join(ROOT, d)));

describe('game keydown handlers guard with isTypingTarget', () => {
  it('no source uses a shadow-blind `target instanceof HTMLInputElement` guard', () => {
    const offenders = files
      .filter((f) => /\.target instanceof HTML(Input|TextArea)Element/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(ROOT.length + 1));
    expect(offenders).toEqual([]);
  });

  it('Word Tower v2 keydown handler checks isTypingTarget', () => {
    const src = readFileSync(join(ROOT, 'components/wordTowerV2/WordTowerV2.tsx'), 'utf8');
    expect(src).toMatch(/isTypingTarget\(event\)/);
  });
});
